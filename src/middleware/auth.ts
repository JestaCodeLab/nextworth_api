import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: "user" | "admin" | "merchant";
  // Set only when userRole === "merchant" — the Merchant directory record
  // this login manages (User.merchantId).
  merchantId?: string;
  contactVerifiedAt?: Date | null;
  tokenExpiresAt?: Date;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id role status merchantId contactVerifiedAt");
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    req.userId = user.id;
    req.userRole = user.role as "user" | "admin" | "merchant";
    if (user.merchantId) req.merchantId = String(user.merchantId);
    req.contactVerifiedAt = user.contactVerifiedAt;
    if (payload.exp) req.tokenExpiresAt = new Date(payload.exp * 1000);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(role: "admin" | "merchant") {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.userRole !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

/**
 * Gates the merchant portal on having completed phone/email OTP contact
 * verification (see merchantVerificationController) — separate from, and
 * checked before, the Merchant record's own admin-review status. Apply
 * after requireAuth + requireRole("merchant"); skip it only on the
 * verification endpoints themselves.
 */
export function requireMerchantContactVerified(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.contactVerifiedAt) {
    return res.status(403).json({ error: "Verify your contact information first" });
  }
  next();
}
