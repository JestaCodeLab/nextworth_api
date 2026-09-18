import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRE: z.string().default("7d"),
  // Reserved for a future refresh-token increment — not used by the current
  // single-access-token auth flow.
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRE: z.string().optional(),
  COOKIE_NAME: z.string().default("nxw_session"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required"),
  PAYSTACK_PUBLIC_KEY: z.string().min(1, "PAYSTACK_PUBLIC_KEY is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().min(1, "RESEND_FROM_EMAIL is required"),
  // Optional until the FlockText account/credentials exist — SMS sending
  // degrades to a clear per-recipient failure until both are set.
  FLOCKTEXT_API_KEY: z.string().optional(),
  FLOCKTEXT_SENDER_ID: z.string().optional(),
  CLIENT_URL: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
