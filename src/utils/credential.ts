import { customAlphabet } from "nanoid";

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
