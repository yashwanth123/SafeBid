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

describe("auth", () => {
  it("registers, logs in, and fetches the current user", async () => {
    const register = await request(app).post("/api/auth/register").send({
      email: "new@safebid.test",
      password: "Password123!",
      name: "Riley Nguyen",
      city: "Austin",
      latitude: 30.27,
      longitude: -97.74,
    });
    expect(register.status).toBe(201);
    expect(register.body.accessToken).toBeTruthy();
    expect(register.body.user.email).toBe("new@safebid.test");

    const me = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${register.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe("Riley Nguyen");

    const login = await request(app).post("/api/auth/login").send({
      email: "new@safebid.test",
      password: "Password123!",
    });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
  });

  it("rejects duplicate emails and bad passwords", async () => {
    await createUser({ email: "dup@safebid.test" });
    const dup = await request(app).post("/api/auth/register").send({
      email: "dup@safebid.test",
      password: "Password123!",
      name: "Dup",
    });
    expect(dup.status).toBe(409);

    const bad = await request(app).post("/api/auth/login").send({
      email: "dup@safebid.test",
      password: "wrong-password",
    });
    expect(bad.status).toBe(401);
  });
});

describe("feed", () => {
  it("creates a post and lists it in the geo feed", async () => {
    const user = await createUser({ email: "feed@safebid.test" });
    const token = (await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "Password123!",
    })).body.accessToken;

    const created = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Anyone else hear the ice cream truck?", category: "GENERAL" });
    expect(created.status).toBe(201);

    const feed = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${token}`);
    expect(feed.status).toBe(200);
    expect(feed.body.posts.some((p: { content: string }) => p.content.includes("ice cream"))).toBe(
      true,
    );
  });
});
