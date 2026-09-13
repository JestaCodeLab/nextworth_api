import type { Response } from "express";
import { User } from "../models/User.js";
import { Credential } from "../models/Credential.js";
import { AuditLog } from "../models/AuditLog.js";
import { generateCredentialId, generateCredentialCode } from "../utils/credential.js";
import { env } from "../config/env.js";
import type { AuthedRequest } from "../middleware/auth.js";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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
  const now = new Date();
  const credential = await Credential.create({
    userId: user.id,
    credentialId,
    credentialCode: generateCredentialCode(),
    qrPayload: `${env.CLIENT_URL}/verify/${credentialId}`,
    status: "active",
    market: user.country,
    issuedAt: now,
    expiresAt: new Date(now.getTime() + ONE_YEAR_MS),
  });

  user.status = "verified";
  await user.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.approve",
    targetType: "User",
    targetId: user.id,
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

  user.status = "rejected";
  await user.save();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "user.reject",
    targetType: "User",
    targetId: user.id,
    notes: typeof req.body?.reason === "string" ? req.body.reason : undefined,
  });

  return res.json({ user: { id: user.id, status: user.status } });
}
