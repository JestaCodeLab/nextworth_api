import type { Response } from "express";
import { Redemption } from "../models/Redemption.js";
import type { AuthedRequest } from "../middleware/auth.js";

export async function listMyTransactions(req: AuthedRequest, res: Response) {
  const redemptions = await Redemption.find({ userId: req.userId }).sort({ redeemedAt: -1 });
  return res.json({ redemptions });
}
