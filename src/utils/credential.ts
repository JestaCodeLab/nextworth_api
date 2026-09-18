import { customAlphabet } from "nanoid";
import { env } from "../config/env.js";

// Excludes visually ambiguous characters (0/O, 1/I) since these are read
// aloud or typed manually by merchants at POS.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const idSuffix = customAlphabet(ALPHABET, 10);
const codeSuffix = customAlphabet(ALPHABET, 6);

/** Non-guessable primary credential identifier, e.g. NXW-GH-7F3KQ9PXHT */
export function generateCredentialId(market: "GH" | "UK") {
  return `NXW-${market}-${idSuffix()}`;
}

/** Short human-typeable code for manual POS entry, e.g. NXW-3K9ZP2 */
export function generateCredentialCode() {
  return `NXW-${codeSuffix()}`;
}

/**
 * Always derived from the *current* env.CLIENT_URL rather than trusted from
 * a stored value — a credential can be approved under one CLIENT_URL (e.g.
 * a local/staging one) and still be scanned long after that env var changes,
 * so baking the domain in at creation time would freeze stale/wrong QR
 * targets. Recomputing it on every read keeps every credential's QR
 * pointing at whatever domain is live right now.
 */
export function credentialQrPayload(credentialId: string) {
  return `${env.CLIENT_URL}/verify/${credentialId}`;
}
