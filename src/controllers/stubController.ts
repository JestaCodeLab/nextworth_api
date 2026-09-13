import type { Request, Response } from "express";

/**
 * Placeholder for endpoints scoped to later increments (credential issuance,
 * merchant/offer management, verification, admin, payments). Kept so the
 * client can be built against a real route surface now.
 */
export function notImplemented(_req: Request, res: Response) {
  res.status(501).json({ error: "Not implemented yet" });
}
