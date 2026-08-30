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

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

describe("fair posted jobs", () => {
  it("rejects prices outside the neighborhood rate card", async () => {
    const customer = await createUser({ email: "hire@safebid.test" });
    const token = await tokenFor(customer.email);
    const low = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Patch a hole in drywall",
        description: "One fist-sized hole in the hallway, paint to match.",
        priceCents: 500,
        category: "HOME",
        scheduledAt: tomorrow(),
      });
    expect(low.status).toBe(400);
    expect(low.body.error).toMatch(/Fair price/i);
  });

  it("lets a verified provider take the posted price; a second neighbor cannot bid", async () => {
    const customer = await createUser({ email: "need@safebid.test" });
    const pro = await createUser({
      email: "take@safebid.test",
      role: "PROVIDER",
      verified: true,
    });
    const other = await createUser({
      email: "late@safebid.test",
      role: "PROVIDER",
      verified: true,
    });
    const cToken = await tokenFor(customer.email);
    const pToken = await tokenFor(pro.email);
    const oToken = await tokenFor(other.email);

    const created = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${cToken}`)
      .send({
        title: "Assemble a dresser this Saturday",
        description: "IKEA Hemnes, all parts in the box, parking in back.",
        priceCents: 7000,
        category: "HOME",
        scheduledAt: tomorrow(),
      });
    expect(created.status).toBe(201);
    expect(created.body.job.priceCents).toBe(7000);
    expect(created.body.job.status).toBe("OPEN");

    const claim = await request(app)
      .post(`/api/jobs/${created.body.job.id}/claim`)
      .set("Authorization", `Bearer ${pToken}`);
    expect(claim.status).toBe(201);
    expect(claim.body.job.status).toBe("CLAIMED");
    expect(claim.body.bookingId).toBeTruthy();

    const booking = await request(app)
      .get(`/api/bookings/${claim.body.bookingId}`)
      .set("Authorization", `Bearer ${cToken}`);
    expect(booking.status).toBe(200);
    expect(booking.body.booking.priceCents).toBe(7000);
    expect(booking.body.booking.commissionCents).toBe(350);

    const second = await request(app)
      .post(`/api/jobs/${created.body.job.id}/claim`)
      .set("Authorization", `Bearer ${oToken}`);
    expect(second.status).toBe(409);
  });

  it("blocks unverified neighbors from taking paid work", async () => {
    const customer = await createUser({ email: "c3@safebid.test" });
    const stranger = await createUser({ email: "no-id@safebid.test" });
    const cToken = await tokenFor(customer.email);
    const sToken = await tokenFor(stranger.email);
    const created = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${cToken}`)
      .send({
        title: "Walk two dogs at noon",
        description: "Both leashes on a hook by the door. Thirty minutes around the block.",
        priceCents: 2200,
        category: "PETS",
        scheduledAt: tomorrow(),
      });
    const claim = await request(app)
      .post(`/api/jobs/${created.body.job.id}/claim`)
      .set("Authorization", `Bearer ${sToken}`);
    expect(claim.status).toBe(403);
  });

  it("keeps hiring off the Nextdoor-style comment thread", async () => {
    const user = await createUser({ email: "feed2@safebid.test" });
    const token = await tokenFor(user.email);
    const jobsPost = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Need a plumber, hit me with a price", category: "JOBS" });
    expect(jobsPost.status).toBe(400);

    const rec = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Anyone recommend a sitter?", category: "RECOMMENDATIONS" });
    expect(rec.status).toBe(201);

    const bid = await request(app)
      .post(`/api/posts/${rec.body.post.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "$80" });
    expect(bid.status).toBe(400);
  });
});
