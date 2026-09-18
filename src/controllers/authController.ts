import type { Request, Response } from "express";
import { z } from "zod";
import { User, type UserDoc } from "../models/User.js";
import { Merchant } from "../models/Merchant.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken, decodeTokenExpiry } from "../utils/jwt.js";
import { getOnboardingStep } from "../utils/onboarding.js";
import { zodErrorMessage } from "../utils/zodError.js";
import { hashResetToken } from "../utils/resetToken.js";
import { sendWelcomeEmail } from "../utils/email.js";
import { env } from "../config/env.js";
import type { AuthedRequest } from "../middleware/auth.js";

// The client (Vercel) and API live on different domains, which browsers
// treat as cross-site — SameSite=Lax cookies are never attached to
// cross-site fetch/XHR requests (only to top-level navigations), so the
// session cookie from login would silently never reach the API on the very
// next request. SameSite=None is required for that, which in turn requires
// Secure (browsers reject None without it) — Chromium-family browsers treat
// http://localhost as a trustworthy origin, so this still works for local
// dev against http://localhost.
export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function serializeUser(user: UserDoc) {
  // Merchant-only fields: contact verification (this login) and application
  // status (the Merchant record it manages) gate different things — see
  // requireMerchantContactVerified and merchantOfferController.createMyOffer.
  const merchant = user.merchantId ? await Merchant.findById(user.merchantId).select("status") : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    photoUrl: user.photoUrl,
    status: user.status,
    rejectionReason: user.rejectionReason,
    role: user.role,
    country: user.country,
    onboardingStep: getOnboardingStep(user),
    notificationPreferences: user.notificationPreferences,
    merchantId: user.merchantId ? String(user.merchantId) : undefined,
    merchantContactVerified: user.merchantId ? Boolean(user.contactVerifiedAt) : undefined,
    merchantStatus: merchant?.status,
  };
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(6),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const { name, email, password, phone } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone,
    status: "pending",
  });

  const token = signToken({ sub: user.id, role: "user" });
  res.cookie(env.COOKIE_NAME, token, cookieOptions);

  // Best-effort — a delivery hiccup shouldn't fail a signup that already succeeded.
  sendWelcomeEmail(user.email, user.name).catch((err) => console.error("sendWelcomeEmail failed", err));

  return res.status(201).json({ user: await serializeUser(user), expiresAt: decodeTokenExpiry(token) });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ sub: user.id, role: user.role as "user" | "admin" | "merchant" });
  res.cookie(env.COOKIE_NAME, token, cookieOptions);

  return res.json({ user: await serializeUser(user), expiresAt: decodeTokenExpiry(token) });
}

const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function setPassword(req: Request, res: Response) {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetTokenExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetTokenExpiresAt");

  if (!user) {
    return res.status(400).json({ error: "This link is invalid or has expired" });
  }

  user.passwordHash = await hashPassword(parsed.data.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  await user.save();

  const token = signToken({ sub: user.id, role: user.role as "user" | "admin" | "merchant" });
  res.cookie(env.COOKIE_NAME, token, cookieOptions);

  return res.json({ user: await serializeUser(user), expiresAt: decodeTokenExpiry(token) });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(env.COOKIE_NAME);
  return res.status(204).send();
}

export async function me(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ user: await serializeUser(user), expiresAt: req.tokenExpiresAt });
}

/** Re-issues a fresh token/cookie for the current session — used by the "Stay logged in" prompt. */
export async function refreshSession(req: AuthedRequest, res: Response) {
  const token = signToken({ sub: req.userId!, role: req.userRole! });
  res.cookie(env.COOKIE_NAME, token, cookieOptions);
  return res.json({ expiresAt: decodeTokenExpiry(token) });
}
