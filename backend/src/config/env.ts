import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const envFile =
  process.env.NODE_ENV === "test"
    ? path.resolve(__dirname, "../../.env.test")
    : path.resolve(__dirname, "../../.env");

dotenv.config({ path: envFile });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  PLATFORM_COMMISSION_BPS: z.coerce.number().default(500),
  MOCK_PAYMENTS: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  MOCK_IDENTITY: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  APPLE_CLIENT_ID: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_IDENTITY_RETURN_URL: z.string().optional().default(""),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().default(8),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
export const commissionRate = env.PLATFORM_COMMISSION_BPS / 10_000;
