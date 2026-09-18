import { MARKETS } from "../models/User.js";

export type Market = (typeof MARKETS)[number];

export const MARKET_CALLING_CODES: Record<Market, string> = {
  GH: "+233",
  UK: "+44",
};

export const MARKET_NAMES: Record<Market, string> = {
  GH: "Ghana",
  UK: "United Kingdom",
};

/**
 * Normalizes a phone number to the calling code for the given market.
 * A bare local number (e.g. "0551234567") gets the market's code prefixed
 * in place of the leading 0. A number already carrying an explicit "+" (or
 * "00") country code is left as international-formatted but flagged via
 * `error` if it doesn't match the expected market — the caller decides
 * whether to reject or silently accept it.
 */
export function resolvePhoneForMarket(rawPhone: string, market: Market): { phone: string; error?: string } {
  const code = MARKET_CALLING_CODES[market];
  const cleaned = rawPhone.trim().replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+")) {
    if (cleaned.startsWith(code)) return { phone: cleaned };
    return { phone: cleaned, error: `Phone number should start with ${code} for ${MARKET_NAMES[market]}` };
  }

  if (cleaned.startsWith("00")) {
    const intl = `+${cleaned.slice(2)}`;
    if (intl.startsWith(code)) return { phone: intl };
    return { phone: intl, error: `Phone number should start with ${code} for ${MARKET_NAMES[market]}` };
  }

  const local = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
  return { phone: `${code}${local}` };
}
