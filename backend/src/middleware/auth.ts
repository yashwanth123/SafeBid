import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { forbidden, unauthorized } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { Role } from "@prisma/client";

export type AccessPayload = {
  sub: string;
  role: Role;
  ver: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        email: string;
        verificationStatus: string;
      };
    }
  }
}

export function signAccessToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role, ver: 1 } satisfies AccessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: string, tokenId: string) {
  return jwt.sign({ sub: userId, jti: tokenId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;
  if (!token) return next(unauthorized());

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    prisma.user
      .findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          email: true,
          verificationStatus: true,
          isActive: true,
          isBanned: true,
        },
      })
      .then((user) => {
        if (!user || !user.isActive || user.isBanned) {
          return next(unauthorized("Account is disabled"));
        }
        req.user = {
          id: user.id,
          role: user.role,
          email: user.email,
          verificationStatus: user.verificationStatus,
        };
        next();
      })
      .catch(next);
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    prisma.user
      .findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, email: true, verificationStatus: true, isActive: true, isBanned: true },
      })
      .then((user) => {
        if (user && user.isActive && !user.isBanned) {
          req.user = {
            id: user.id,
            role: user.role,
            email: user.email,
            verificationStatus: user.verificationStatus,
          };
        }
        next();
      })
      .catch(next);
  } catch {
    next();
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export function requireVerified(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.verificationStatus !== "VERIFIED" && req.user.role !== "ADMIN") {
    return next(forbidden("ID verification is required to offer services"));
  }
  next();
}
