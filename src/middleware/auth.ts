import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: "user" | "admin";
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id role status");
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    req.userId = user.id;
    req.userRole = user.role as "user" | "admin";
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(role: "admin") {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.userRole !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
