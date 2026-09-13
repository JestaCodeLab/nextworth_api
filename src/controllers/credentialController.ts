import type { Response } from "express";
import { Credential } from "../models/Credential.js";
import type { AuthedRequest } from "../middleware/auth.js";

export async function getMyCredential(req: AuthedRequest, res: Response) {
  const credential = await Credential.findOne({ userId: req.userId });
  return res.json({ credential: credential ?? null });
}
