import { PricingConfig } from "../models/PricingConfig.js";
import type { MARKETS } from "../models/User.js";

// Default pricing if an admin hasn't edited /admin/settings yet — matches
// the brief's GH figure; the UK figure is a USD placeholder (Paystack
// doesn't support GBP). Both are editable via PricingConfig once seeded.
export const DEFAULT_PRICING: Record<"GH" | "UK", { amount: number; currency: "GHS" | "USD" }> = {
  GH: { amount: 99, currency: "GHS" },
  UK: { amount: 12, currency: "USD" },
};

export async function getOrCreatePricing(market: (typeof MARKETS)[number]) {
  const existing = await PricingConfig.findOne({ market });
  if (existing) return existing;
  return PricingConfig.create({ market, ...DEFAULT_PRICING[market] });
}
