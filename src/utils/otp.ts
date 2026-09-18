import crypto from "node:crypto";

const OTP_TTL_MS = 10 * 60 * 1000;

/** Generates a 6-digit verification code. Only the hash is stored server-side; the raw code goes out via SMS/email. */
export function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { code, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) };
}

export function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
