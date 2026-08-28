import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AccessPayload } from "../middleware/auth";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    socket.on("join:feed", () => socket.join("feed"));
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitFeed(event: string, payload: unknown) {
  io?.to("feed").emit(event, payload);
}

export function getIo() {
  return io;
}
