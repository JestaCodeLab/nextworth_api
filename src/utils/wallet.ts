import { flockTextFetch, isFlockTextConfigured } from "../config/flocktext.js";

interface FlockTextWalletResponse {
  creditsBalance: number;
}

export interface WalletBalance {
  balance: number | null;
  currency?: string;
  error?: string;
}

/**
 * GET /wallet/balance — SMS credit balance for the organization. FlockText
 * returns `{ data: { creditsBalance } }` (confirmed against a live account),
 * a plain credit count rather than a currency amount — there's no currency
 * field in the response.
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  if (!isFlockTextConfigured()) {
    return { balance: null, error: "SMS provider not configured yet" };
  }

  try {
    const { data } = await flockTextFetch<FlockTextWalletResponse>("/wallet/balance");
    return { balance: data?.creditsBalance ?? null };
  } catch (err) {
    return { balance: null, error: err instanceof Error ? err.message : "Couldn't fetch wallet balance" };
  }
}
