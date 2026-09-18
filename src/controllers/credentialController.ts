import type { Response } from "express";
import { Credential } from "../models/Credential.js";
import { credentialQrPayload } from "../utils/credential.js";
import type { AuthedRequest } from "../middleware/auth.js";

export async function getMyCredential(req: AuthedRequest, res: Response) {
  const credential = await Credential.findOne({ userId: req.userId });
  if (!credential) {
    return res.json({ credential: null });
  }

  return res.json({
    credential: { ...credential.toObject(), qrPayload: credentialQrPayload(credential.credentialId) },
  });
}
