import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app";

export const prisma = new PrismaClient();
export const app = createApp();

export async function resetDb() {
  const tables = [
    "messages",
    "conversations",
    "notifications",
    "disputes",
    "reports",
    "reviews",
    "withdrawals",
    "ledger_entries",
    "booking_status_events",
    "payments",
    "bookings",
    "job_requests",
    "services",
    "shares",
    "likes",
    "comments",
    "posts",
    "refresh_tokens",
    "wallets",
    "platform_ledger",
    "users",
  ];
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  await prisma.platformBalance.upsert({
    where: { id: "platform" },
    create: { id: "platform", balanceCents: 0 },
    update: { balanceCents: 0 },
  });
}

export async function createUser(opts?: {
  email?: string;
  role?: "USER" | "PROVIDER" | "ADMIN";
  verified?: boolean;
  lat?: number;
  lng?: number;
}) {
  const passwordHash = await bcrypt.hash("Password123!", 8);
  const user = await prisma.user.create({
    data: {
      email: opts?.email ?? `u${Date.now()}${Math.random()}@safebid.test`,
      passwordHash,
      name: "Test Neighbor",
      role: opts?.role ?? "USER",
      verificationStatus: opts?.verified ? "VERIFIED" : "UNVERIFIED",
      latitude: opts?.lat ?? 30.2672,
      longitude: opts?.lng ?? -97.7431,
      city: "Austin",
    },
  });
  await prisma.wallet.create({ data: { userId: user.id } });
  return user;
}

export async function login(email: string, password = "Password123!") {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.accessToken as string;
}
