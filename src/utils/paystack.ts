import crypto from "node:crypto";
import { env } from "../config/env.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Confirms a transaction's outcome directly with Paystack. Used both as the
 * immediate confirmation path right after the Inline/Popup checkout reports
 * success, and available as a manual re-check — the webhook
 * (verifyWebhookSignature below) remains the authoritative async source of
 * truth in case the client never calls back.
 */
export async function verifyTransaction(
  reference: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    },
  );

  const data = (await res.json()) as {
    status: boolean;
    data?: { status: string };
  };
  return { success: res.ok && data.status && data.data?.status === "success" };
}

/** Verifies the `x-paystack-signature` header against the raw request body per Paystack's webhook spec. */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
