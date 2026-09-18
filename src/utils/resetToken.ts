import crypto from "node:crypto";

const RESET_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48h — long enough for an admin-sent invite to be picked up

/** Generates a random reset token. Only the hash is stored server-side; the raw token goes out in the email link. */
export function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
