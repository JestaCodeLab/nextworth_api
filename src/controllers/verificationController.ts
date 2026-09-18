import type { Request, Response } from "express";
import { Credential } from "../models/Credential.js";
import { User } from "../models/User.js";
import { VerificationEvent, type VerificationEventDoc } from "../models/VerificationEvent.js";

export type Result = VerificationEventDoc["result"];

export function computeResult(status: string, expiresAt?: Date | null): Result {
  if (status === "suspended") return "suspended";
  if (status === "expired" || (expiresAt && expiresAt.getTime() < Date.now())) return "expired";
  if (status === "active") return "valid";
  return "invalid";
}

export async function verifyCredential(req: Request, res: Response) {
  const credential = await Credential.findOne({ credentialId: req.params.credentialId });
  if (!credential) {
    return res.status(404).json({ error: "Credential not found" });
  }

  const user = await User.findById(credential.userId);
  const result = computeResult(credential.status, credential.expiresAt);

  await VerificationEvent.create({
    credentialId: credential.id,
    result,
    ipAddress: req.ip,
  });

  return res.json({
    result,
    holder: {
      name: user?.name ?? "Unknown",
      photoUrl: user?.photoUrl ?? null,
    },
    credential: {
      status: credential.status,
      expiresAt: credential.expiresAt,
    },
  });
}
