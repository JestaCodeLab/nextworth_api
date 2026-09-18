import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  sub: string; // user id
  role: "user" | "admin" | "merchant";
  // Added by jsonwebtoken itself when `expiresIn`/`iat` are used — not set by us directly.
  exp?: number;
  iat?: number;
}

export function signToken(payload: { sub: string; role: "user" | "admin" | "merchant" }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/** Reads a freshly-signed token's `exp` claim — no signature check needed since we just minted it. */
export function decodeTokenExpiry(token: string): Date | undefined {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  return decoded?.exp ? new Date(decoded.exp * 1000) : undefined;
}
