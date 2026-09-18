import type { Response } from "express";
import { z } from "zod";
import { PricingConfig } from "../models/PricingConfig.js";
import { MARKETS } from "../models/User.js";
import { CURRENCIES } from "../models/Payment.js";
import { zodErrorMessage } from "../utils/zodError.js";
import { DEFAULT_PRICING } from "../utils/pricing.js";
import type { AuthedRequest } from "../middleware/auth.js";

const updatePricingSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(CURRENCIES),
});

export async function listPricing(_req: AuthedRequest, res: Response) {
  const existing = await PricingConfig.find();
  const byMarket = new Map(existing.map((row) => [row.market, row]));

  const missing = MARKETS.filter((market) => !byMarket.has(market));
  if (missing.length > 0) {
    const created = await PricingConfig.insertMany(missing.map((market) => ({ market, ...DEFAULT_PRICING[market] })));
    for (const row of created) byMarket.set(row.market, row);
  }

  return res.json({ pricing: MARKETS.map((market) => byMarket.get(market)) });
}

export async function updatePricing(req: AuthedRequest, res: Response) {
  const market = req.params.market as (typeof MARKETS)[number];
  if (!MARKETS.includes(market)) {
    return res.status(404).json({ error: "Unknown market" });
  }

  const parsed = updatePricingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const pricing = await PricingConfig.findOneAndUpdate(
    { market },
    { amount: parsed.data.amount, currency: parsed.data.currency },
    { new: true, upsert: true },
  );

  return res.json({ pricing });
}
