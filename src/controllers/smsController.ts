import type { Response } from "express";
import { SmsLog } from "../models/SmsLog.js";
import { getWalletBalance } from "../utils/wallet.js";
import { isFlockTextConfigured } from "../config/flocktext.js";
import { env } from "../config/env.js";
import type { AuthedRequest } from "../middleware/auth.js";

/** Lightweight status for the Communication page's SMS tab — configured flag, sender ID, and wallet balance, no log history. */
export async function getSmsStatus(_req: AuthedRequest, res: Response) {
  const wallet = await getWalletBalance();
  return res.json({
    configured: isFlockTextConfigured(),
    senderId: env.FLOCKTEXT_SENDER_ID ?? null,
    wallet,
  });
}

export async function getSmsOverview(_req: AuthedRequest, res: Response) {
  const [wallet, totalSent, totalFailed, recentLogs] = await Promise.all([
    getWalletBalance(),
    SmsLog.countDocuments({ status: "sent" }),
    SmsLog.countDocuments({ status: "failed" }),
    SmsLog.find().sort({ createdAt: -1 }).limit(100),
  ]);

  return res.json({
    configured: isFlockTextConfigured(),
    wallet,
    totalSent,
    totalFailed,
    logs: recentLogs,
  });
}
