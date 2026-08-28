import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { authenticator } from "otplib";
import { OAuth2Client } from "google-auth-library";
import { AuthProvider, Role } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, conflict, unauthorized } from "../../lib/errors";
import { toMe } from "../../lib/serializers";
import { ensureWallet } from "../../lib/wallet";
import { validate } from "../../middleware/errorHandler";
import { requireAuth, signAccessToken, signRefreshToken } from "../../middleware/auth";
import jwt from "jsonwebtoken";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(80),
  inviteCode: z.string().max(80).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional(),
});

async function issueTokens(userId: string, role: Role, res: import("express").Response) {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(userId, tokenId);
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { id: tokenId, userId, tokenHash, expiresAt },
  });
  const accessToken = signAccessToken(userId, role);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
  return { accessToken, refreshToken };
}

authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, inviteCode, latitude, longitude, address, city } = req.body;
    if (env.INVITE_CODE && inviteCode?.trim() !== env.INVITE_CODE) {
      throw unauthorized("That invite code is not valid");
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw conflict("An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        latitude,
        longitude,
        address,
        city,
        authProvider: AuthProvider.LOCAL,
      },
    });
    await ensureWallet(user.id);
    const tokens = await issueTokens(user.id, user.role, res);
    res.status(201).json({ user: toMe(user), ...tokens });
  }),
);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash) throw unauthorized("Invalid email or password");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");
    if (!user.isActive || user.isBanned) throw unauthorized("Account is disabled");

    if (user.twoFactorEnabled) {
      if (!otp || !user.twoFactorSecret || !authenticator.check(otp, user.twoFactorSecret)) {
        return res.status(401).json({
          error: "Two-factor code required",
          code: "OTP_REQUIRED",
        });
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await issueTokens(user.id, user.role, res);
    res.json({ user: toMe(user), ...tokens });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = (req.body?.refreshToken as string | undefined) || req.cookies?.refreshToken;
    if (!token) throw unauthorized("Refresh token missing");
    let payload: { sub: string; jti: string };
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string };
    } catch {
      throw unauthorized("Invalid refresh token");
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.tokenHash !== tokenHash || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized("Refresh token revoked");
    }
    stored.revokedAt = new Date();
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.isBanned) throw unauthorized("Account is disabled");
    const tokens = await issueTokens(user.id, user.role, res);
    res.json({ user: toMe(user), ...tokens });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = (req.body?.refreshToken as string | undefined) || req.cookies?.refreshToken;
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.json({ ok: true });
  }),
);

const googleSchema = z.object({ idToken: z.string().min(10) });

authRouter.post(
  "/google",
  validate(googleSchema),
  asyncHandler(async (req, res) => {
    if (!env.GOOGLE_CLIENT_ID) {
      throw badRequest("Google OAuth is not configured");
    }
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: req.body.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw unauthorized("Google account has no email");

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split("@")[0],
          photoUrl: payload.picture,
          googleId: payload.sub,
          authProvider: AuthProvider.GOOGLE,
        },
      });
      await ensureWallet(user.id);
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }
    const tokens = await issueTokens(user.id, user.role, res);
    res.json({ user: toMe(user), ...tokens });
  }),
);

const appleSchema = z.object({
  identityToken: z.string().min(10),
  name: z.string().optional(),
});

authRouter.post(
  "/apple",
  validate(appleSchema),
  asyncHandler(async (req, res) => {
    if (!env.APPLE_CLIENT_ID) throw badRequest("Apple Sign In is not configured");
    const decoded = jwt.decode(req.body.identityToken) as { sub?: string; email?: string } | null;
    if (!decoded?.sub) throw unauthorized("Invalid Apple token");
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { appleId: decoded.sub },
          ...(decoded.email ? [{ email: decoded.email.toLowerCase() }] : []),
        ],
      },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: (decoded.email || `${decoded.sub}@privaterelay.appleid.com`).toLowerCase(),
          name: req.body.name || "Apple Neighbor",
          appleId: decoded.sub,
          authProvider: AuthProvider.APPLE,
        },
      });
      await ensureWallet(user.id);
    }
    const tokens = await issueTokens(user.id, user.role, res);
    res.json({ user: toMe(user), ...tokens });
  }),
);

authRouter.post(
  "/2fa/setup",
  requireAuth,
  asyncHandler(async (req, res) => {
    const secret = authenticator.generateSecret();
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorSecret: secret },
    });
    const otpauth = authenticator.keyuri(req.user!.email, "SafeBid", secret);
    res.json({ secret, otpauth });
  }),
);

authRouter.post(
  "/2fa/enable",
  requireAuth,
  validate(z.object({ otp: z.string().min(6).max(8) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.twoFactorSecret) throw badRequest("Call /2fa/setup first");
    if (!authenticator.check(req.body.otp, user.twoFactorSecret)) {
      throw unauthorized("Invalid authenticator code");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/2fa/disable",
  requireAuth,
  validate(z.object({ otp: z.string().min(6).max(8) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.twoFactorSecret || !authenticator.check(req.body.otp, user.twoFactorSecret)) {
      throw unauthorized("Invalid authenticator code");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ ok: true });
  }),
);
