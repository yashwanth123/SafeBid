import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { postsRouter } from "./modules/posts/posts.routes";
import { servicesRouter } from "./modules/services/services.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { paymentsRouter, stripeWebhookHandler } from "./modules/payments/payments.routes";
import { identityRouter } from "./modules/identity/identity.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { disputesRouter } from "./modules/disputes/disputes.routes";
import { messagesRouter } from "./modules/messages/messages.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { openApiSpec } from "./docs/openapi";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.NODE_ENV !== "production") return callback(null, true);
        const allowed = env.FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean);
        if (allowed.includes("*") || allowed.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(
    "/api/payments/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler,
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === "test" ? 1000 : 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use("/uploads", express.static(uploadDir));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, name: "safebid-api", time: new Date().toISOString() });
  });

  app.get("/api/meta", (_req, res) => {
    res.json({
      name: "safebid",
      inviteRequired: Boolean(env.INVITE_CODE),
      mockPayments: env.MOCK_PAYMENTS,
      mockIdentity: env.MOCK_IDENTITY,
    });
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === "test" ? 1000 : 40,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    authRouter,
  );
  app.use("/api/users", usersRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/identity", identityRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/disputes", disputesRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/uploads", uploadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
