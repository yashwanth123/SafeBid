import request from "supertest";
import { app, createUser, prisma, resetDb } from "./helpers";

beforeAll(async () => {
  await prisma.$connect();
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDb();
});

async function tokenFor(email: string) {
  const res = await request(app).post("/api/auth/login").send({
    email,
    password: "Password123!",
  });
  return res.body.accessToken as string;
}

describe("marketplace escrow", () => {
  it("requires ID verification before listing a service", async () => {
    const neighbor = await createUser({ email: "unverified@safebid.test" });
    const token = await tokenFor(neighbor.email);
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Lawn mowing",
        description: "I will mow your lawn this weekend.",
        priceCents: 4500,
        category: "OUTDOORS",
      });
    expect(res.status).toBe(403);
  });

  it("runs the job state machine, 5% commission, and escrow release", async () => {
    const provider = await createUser({
      email: "pro@safebid.test",
      role: "PROVIDER",
      verified: true,
    });
    const customer = await createUser({ email: "cus@safebid.test" });
    const pToken = await tokenFor(provider.email);
    const cToken = await tokenFor(customer.email);

    const service = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${pToken}`)
      .send({
        title: "Patio furniture assembly",
        description: "Two hours of assembly including haul-away of boxes.",
        priceCents: 10000,
        category: "HOME",
      });
    expect(service.status).toBe(201);

    const when = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${cToken}`)
      .send({ serviceId: service.body.service.id, scheduledAt: when });
    expect(booking.status).toBe(201);
    expect(booking.body.booking.status).toBe("CREATED");
    expect(booking.body.booking.commissionCents).toBe(500);

    const pay = await request(app)
      .post(`/api/payments/bookings/${booking.body.booking.id}/intent`)
      .set("Authorization", `Bearer ${cToken}`);
    expect(pay.status).toBe(200);
    expect(pay.body.status).toBe("ESCROWED");

    const confirmTooSoon = await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/start`)
      .set("Authorization", `Bearer ${pToken}`);
    expect(confirmTooSoon.status).toBe(400);

    const confirm = await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/confirm`)
      .set("Authorization", `Bearer ${pToken}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.booking.status).toBe("CONFIRMED");

    await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/start`)
      .set("Authorization", `Bearer ${pToken}`);
    await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/complete`)
      .set("Authorization", `Bearer ${pToken}`);

    const review = await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/review`)
      .set("Authorization", `Bearer ${cToken}`)
      .send({ rating: 5, body: "On time and tidy." });
    expect(review.status).toBe(200);
    expect(review.body.booking.status).toBe("REVIEWED");
    expect(review.body.booking.payment.status).toBe("RELEASED");

    const wallet = await request(app)
      .get("/api/payments/wallet")
      .set("Authorization", `Bearer ${pToken}`);
    expect(wallet.body.wallet.availableBalanceCents).toBe(9500);
    expect(wallet.body.wallet.pendingBalanceCents).toBe(0);

    const platform = await prisma.platformBalance.findUnique({ where: { id: "platform" } });
    expect(platform?.balanceCents).toBe(500);
  });

  it("refunds escrow on cancel and blocks overdraft withdrawals", async () => {
    const provider = await createUser({
      email: "pro2@safebid.test",
      role: "PROVIDER",
      verified: true,
    });
    const customer = await createUser({ email: "cus2@safebid.test" });
    const pToken = await tokenFor(provider.email);
    const cToken = await tokenFor(customer.email);

    const service = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${pToken}`)
      .send({
        title: "Gutter clean",
        description: "Front and back gutters, downspouts flushed.",
        priceCents: 8000,
        category: "OUTDOORS",
      });
    const when = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const booking = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${cToken}`)
      .send({ serviceId: service.body.service.id, scheduledAt: when });
    await request(app)
      .post(`/api/payments/bookings/${booking.body.booking.id}/intent`)
      .set("Authorization", `Bearer ${cToken}`);

    const cancel = await request(app)
      .post(`/api/bookings/${booking.body.booking.id}/cancel`)
      .set("Authorization", `Bearer ${cToken}`)
      .send({ reason: "Plans changed" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.booking.status).toBe("CANCELLED");
    expect(cancel.body.booking.payment.status).toBe("REFUNDED");

    const wallet = await request(app)
      .get("/api/payments/wallet")
      .set("Authorization", `Bearer ${pToken}`);
    expect(wallet.body.wallet.pendingBalanceCents).toBe(0);
    expect(wallet.body.wallet.availableBalanceCents).toBe(0);

    const overdraft = await request(app)
      .post("/api/payments/withdraw")
      .set("Authorization", `Bearer ${pToken}`)
      .send({ amountCents: 1000 });
    expect(overdraft.status).toBe(400);
  });
});

describe("identity mock", () => {
  it("marks a provider as verified", async () => {
    const user = await createUser({ email: "id@safebid.test" });
    const token = await tokenFor(user.email);
    const start = await request(app)
      .post("/api/identity/session")
      .set("Authorization", `Bearer ${token}`);
    expect(start.status).toBe(200);
    const done = await request(app)
      .post("/api/identity/mock/complete")
      .set("Authorization", `Bearer ${token}`)
      .send({ outcome: "verified" });
    expect(done.body.status).toBe("VERIFIED");
  });
});
