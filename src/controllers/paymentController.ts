import type { Request, Response } from "express";
import { Payment } from "../models/Payment.js";
import { Credential } from "../models/Credential.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { verifyTransaction, verifyWebhookSignature } from "../utils/paystack.js";
import { getOrCreatePricing } from "../utils/pricing.js";
import type { AuthedRequest } from "../middleware/auth.js";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Marks a pending Payment confirmed and activates the matching pending
 * Credential. Called from two places — right after the Inline/Popup
 * checkout reports success (fast path) and from the Paystack webhook
 * (authoritative fallback) — so it's written to be safe to run twice for
 * the same reference (the `status: "pending"` filter makes the second call
 * a no-op).
 */
async function confirmPayment(reference: string) {
  const payment = await Payment.findOne({ providerRef: reference, status: "pending" });
  if (!payment) return;

  payment.status = "confirmed";
  await payment.save();

  const credential = await Credential.findOne({ userId: payment.userId, status: "pending" });
  if (credential) {
    const now = new Date();
    credential.status = "active";
    credential.issuedAt = now;
    credential.expiresAt = new Date(now.getTime() + ONE_YEAR_MS);
    await credential.save();
  }
}

export async function getMyPricing(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user?.country) {
    return res.status(400).json({ error: "User has not submitted verification details yet" });
  }

  const pricing = await getOrCreatePricing(user.country);
  return res.json({ amount: pricing.amount, currency: pricing.currency });
}

export async function initializePayment(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!user.country) {
    return res.status(400).json({ error: "User has not submitted verification details yet" });
  }

  const credential = await Credential.findOne({ userId: user.id });
  if (!credential || credential.status !== "pending") {
    return res.status(400).json({ error: "No payment is due for this account right now" });
  }

  const pricing = await getOrCreatePricing(user.country);

  // The popup (Inline) checkout runs entirely client-side against Paystack —
  // no server-to-server "initialize" call is needed. We just need a
  // reference to open the popup with and to reconcile against afterward.
  const payment = await Payment.create({
    userId: user.id,
    amount: pricing.amount,
    currency: pricing.currency,
    provider: "paystack",
    status: "pending",
  });
  payment.providerRef = payment.id;
  await payment.save();

  return res.json({
    reference: payment.id,
    amount: pricing.amount,
    currency: pricing.currency,
    email: user.email,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
  });
}

/** Called right after the Inline/Popup checkout's onSuccess fires, for an immediate confirmation without waiting on the webhook. */
export async function verifyPayment(req: AuthedRequest, res: Response) {
  const payment = await Payment.findOne({ providerRef: req.params.reference, userId: req.userId });
  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }

  if (payment.status === "confirmed") {
    return res.json({ confirmed: true });
  }

  const { success } = await verifyTransaction(req.params.reference);
  if (success) {
    await confirmPayment(req.params.reference);
    return res.json({ confirmed: true });
  }

  return res.json({ confirmed: false });
}

export async function paystackWebhook(req: Request, res: Response) {
  const signature = req.get("x-paystack-signature");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body as { event?: string; data?: { reference?: string } };
  const reference = event.data?.reference;

  if (reference && event.event === "charge.success") {
    await confirmPayment(reference);
  } else if (reference && event.event === "charge.failed") {
    await Payment.updateOne({ providerRef: reference, status: "pending" }, { status: "failed" });
  }

  return res.status(200).json({ received: true });
}

export async function getMyLatestPayment(req: AuthedRequest, res: Response) {
  const payment = await Payment.findOne({ userId: req.userId }).sort({ createdAt: -1 });
  return res.json({ payment: payment ?? null });
}

export async function listMyPayments(req: AuthedRequest, res: Response) {
  const payments = await Payment.find({ userId: req.userId }).sort({ createdAt: -1 });
  return res.json({ payments });
}

export async function listPayments(_req: AuthedRequest, res: Response) {
  const payments = await Payment.find().sort({ createdAt: -1 }).populate("userId", "name email");
  return res.json({ payments });
}
