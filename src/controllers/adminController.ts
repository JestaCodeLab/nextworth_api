import type { Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { User, MARKETS } from "../models/User.js";
import { Credential } from "../models/Credential.js";
import { Merchant } from "../models/Merchant.js";
import { Payment } from "../models/Payment.js";
import { AuditLog } from "../models/AuditLog.js";
import { SmsLog } from "../models/SmsLog.js";
import { generateCredentialId, generateCredentialCode } from "../utils/credential.js";
import { generateResetToken } from "../utils/resetToken.js";
import { sendSetPasswordEmail } from "../utils/email.js";
import { sendSms } from "../utils/sms.js";
import { hashPassword } from "../utils/password.js";
import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import { zodErrorMessage } from "../utils/zodError.js";
import { cloudinary } from "../config/cloudinary.js";
import type { AuthedRequest } from "../middleware/auth.js";

export async function approveUser(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!user.country) {
    return res.status(400).json({ error: "User has not submitted verification details yet" });
  }
  if (user.status === "verified") {
    return res.status(409).json({ error: "User is already verified" });
  }

  const existing = await Credential.findOne({ userId: user.id });
  if (existing) {
    return res.status(409).json({ error: "User already has a credential" });
  }

  const credentialId = generateCredentialId(user.country);
  // Credential starts "pending" — it only becomes "active" (and its 1-year
  // validity clock starts) once payment is confirmed via the Paystack
  // webhook. See paymentController.paystackWebhook.
  const credential = await Credential.create({
    userId: user.id,
    credentialId,
    credentialCode: generateCredentialCode(),
    qrPayload: `${env.CLIENT_URL}/verify/${credentialId}`,
    status: "pending",
    market: user.country,
  });

  user.status = "verified";
  user.rejectionReason = undefined;
  await user.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.approve",
    targetType: "User",
    targetId: user.id,
  });

  const approvalTitle = "You're verified on Nexworth";
  const approvalBody = `Hi ${user.name}, you're verified! Complete payment to activate your digital discount card.`;

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: user.email,
    subject: approvalTitle,
    html: `<p>${approvalBody}</p>`,
  });

  // SMS is Ghana-only for now (see utils/sms.ts) — UK members just get the
  // email above until a UK-capable provider is wired up.
  const smsResult = await sendSms(user.phone, approvalBody, user.name);
  await SmsLog.create({
    recipientPhone: user.phone,
    recipientName: user.name,
    message: approvalBody,
    status: smsResult.success ? "sent" : "failed",
    providerMessageId: smsResult.providerMessageId,
    error: smsResult.error,
  });

  return res.json({ credential });
}

export async function rejectUser(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (user.status === "rejected") {
    return res.status(409).json({ error: "User is already rejected" });
  }

  const reason = typeof req.body?.reason === "string" && req.body.reason.trim() ? req.body.reason.trim() : undefined;

  user.status = "rejected";
  user.rejectionReason = reason;
  await user.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.reject",
    targetType: "User",
    targetId: user.id,
    notes: reason,
  });

  return res.json({ user: { id: user.id, status: user.status } });
}

export async function getDashboardStats(_req: AuthedRequest, res: Response) {
  const [totalUsers, activeCredentials, pendingVerifications, merchants, revenueByCurrency, recentPayments] =
    await Promise.all([
      User.countDocuments(),
      Credential.countDocuments({ status: "active" }),
      User.countDocuments({ status: "pending", country: { $ne: null } }),
      Merchant.countDocuments(),
      Payment.aggregate([
        { $match: { status: "confirmed" } },
        { $group: { _id: "$currency", total: { $sum: "$amount" } } },
      ]),
      Payment.find().sort({ createdAt: -1 }).limit(5).populate("userId", "name email"),
    ]);

  return res.json({
    totalUsers,
    activeCredentials,
    pendingVerifications,
    merchants,
    revenueByCurrency: revenueByCurrency.map((row) => ({ currency: row._id, total: row.total })),
    recentPayments,
  });
}

/** "Users & Credentials" is member-only — admin and merchant logins are managed from their own pages. */
export async function listUsers(_req: AuthedRequest, res: Response) {
  const [users, credentials] = await Promise.all([
    User.find({ role: "user" })
      .select("name email phone dob status rejectionReason country role photoUrl docPublicId createdAt +passwordResetTokenHash")
      .sort({ createdAt: -1 }),
    Credential.find().select("userId status"),
  ]);

  const credentialStatusByUserId = new Map(credentials.map((c) => [c.userId.toString(), c.status]));

  return res.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      status: user.status,
      rejectionReason: user.rejectionReason,
      country: user.country,
      role: user.role,
      photoUrl: user.photoUrl,
      hasDocument: Boolean(user.docPublicId),
      hasPendingInvite: Boolean(user.passwordResetTokenHash),
      createdAt: user.createdAt,
      credentialStatus: credentialStatusByUserId.get(user.id) ?? "none",
    })),
  });
}

/** Regenerates a fresh signed Cloudinary URL for the user's KYC document (stored as "authenticated" delivery — not directly browsable) and redirects to it. */
export async function getUserDocumentUrl(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id).select("docPublicId docResourceType");
  if (!user?.docPublicId) {
    return res.status(404).json({ error: "No document on file for this user" });
  }

  const url = cloudinary.url(user.docPublicId, {
    type: "authenticated",
    resource_type: user.docResourceType ?? "image",
    sign_url: true,
    secure: true,
  });

  return res.redirect(url);
}

const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  dob: z.coerce.date().optional(),
  country: z.enum(MARKETS).optional(),
});

export async function updateUserByAdmin(req: AuthedRequest, res: Response) {
  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (parsed.data.email && parsed.data.email !== user.email) {
    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
  }

  Object.assign(user, parsed.data);
  await user.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.update",
    targetType: "User",
    targetId: user.id,
  });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      country: user.country,
    },
  });
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
});

export async function createUserByAdmin(req: AuthedRequest, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  // Unguessable placeholder — nobody can log in with it. The real password
  // is set via the emailed link, which is the only way into the account.
  const placeholderPasswordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const { token, tokenHash, expiresAt } = generateResetToken();

  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    passwordHash: placeholderPasswordHash,
    passwordResetTokenHash: tokenHash,
    passwordResetTokenExpiresAt: expiresAt,
    status: "pending",
  });

  await sendSetPasswordEmail(user.email, user.name, token);

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.invite",
    targetType: "User",
    targetId: user.id,
  });

  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
}

export async function resendInvite(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id).select("+passwordResetTokenHash");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!user.passwordResetTokenHash) {
    return res.status(409).json({ error: "This user has already set their password" });
  }

  const { token, tokenHash, expiresAt } = generateResetToken();
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetTokenExpiresAt = expiresAt;
  await user.save();

  await sendSetPasswordEmail(user.email, user.name, token);

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.invite.resend",
    targetType: "User",
    targetId: user.id,
  });

  return res.json({ ok: true });
}

/**
 * Creates the merchant's portal login (a User with role: "merchant" linked
 * via merchantId) and emails the same set-password link used for admin-
 * invited members. Merchants have no password of their own until this is
 * called — without it, an approved Merchant record still can't log in.
 */
export async function inviteMerchantUser(req: AuthedRequest, res: Response) {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }
  if (!merchant.contactEmail) {
    return res.status(400).json({ error: "This merchant has no contact email on file yet" });
  }

  const existingLogin = await User.findOne({ merchantId: merchant.id });
  if (existingLogin) {
    return res.status(409).json({ error: "This merchant already has a portal login" });
  }

  const existingEmail = await User.findOne({ email: merchant.contactEmail });
  if (existingEmail) {
    return res.status(409).json({ error: "An account with this merchant's contact email already exists" });
  }

  const placeholderPasswordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const { token, tokenHash, expiresAt } = generateResetToken();

  const user = await User.create({
    name: merchant.name,
    email: merchant.contactEmail,
    phone: merchant.contactPhone ?? "",
    passwordHash: placeholderPasswordHash,
    passwordResetTokenHash: tokenHash,
    passwordResetTokenExpiresAt: expiresAt,
    role: "merchant",
    merchantId: merchant.id,
    // Merchant approval already happened on the Merchant record itself —
    // this login's own status shouldn't show as "pending" in the topbar.
    status: "verified",
  });

  await sendSetPasswordEmail(user.email, user.name, token);

  await AuditLog.create({
    adminUserId: req.userId,
    action: "merchant.invite",
    targetType: "Merchant",
    targetId: merchant.id,
  });

  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
}

export async function suspendCredential(req: AuthedRequest, res: Response) {
  const credential = await Credential.findOne({ userId: req.params.id });
  if (!credential) {
    return res.status(404).json({ error: "This user has no credential" });
  }
  if (credential.status !== "active") {
    return res.status(409).json({ error: "Only an active credential can be suspended" });
  }

  credential.status = "suspended";
  await credential.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "credential.suspend",
    targetType: "Credential",
    targetId: credential.id,
  });

  return res.json({ credential });
}

export async function reactivateCredential(req: AuthedRequest, res: Response) {
  const credential = await Credential.findOne({ userId: req.params.id });
  if (!credential) {
    return res.status(404).json({ error: "This user has no credential" });
  }
  if (credential.status !== "suspended") {
    return res.status(409).json({ error: "Only a suspended credential can be reactivated" });
  }

  credential.status = "active";
  await credential.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "credential.reactivate",
    targetType: "Credential",
    targetId: credential.id,
  });

  return res.json({ credential });
}
