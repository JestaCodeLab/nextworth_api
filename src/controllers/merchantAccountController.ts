import type { Response } from "express";
import { z } from "zod";
import { Merchant } from "../models/Merchant.js";
import { resolvePhoneForMarket, MARKET_NAMES, type Market } from "../utils/phone.js";
import { zodErrorMessage } from "../utils/zodError.js";
import type { AuthedRequest } from "../middleware/auth.js";

// Unlike the admin single-location form, a merchant manages their own list of
// locations directly — each needs its own label so the redemption screen can
// let the merchant pick which branch a sale happened at.
const locationInputSchema = z.object({
  label: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  mapsUrl: z.string().url(),
});

const updateMyMerchantSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(6).optional(),
  locations: z.array(locationInputSchema).optional(),
});

export async function getMyMerchant(req: AuthedRequest, res: Response) {
  const merchant = await Merchant.findById(req.merchantId);
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }
  return res.json({ merchant });
}

export async function updateMyMerchant(req: AuthedRequest, res: Response) {
  const parsed = updateMyMerchantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const existing = await Merchant.findById(req.merchantId);
  if (!existing) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  const { locations, contactPhone, ...rest } = parsed.data;
  const market = existing.country as Market;

  let normalizedPhone = contactPhone;
  if (contactPhone) {
    const resolved = resolvePhoneForMarket(contactPhone, market);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    normalizedPhone = resolved.phone;
  }

  const update: Record<string, unknown> = { ...rest };
  if (normalizedPhone) update.contactPhone = normalizedPhone;
  if (locations) {
    update.locations = locations.map((location) => ({
      label: location.label,
      address: location.address,
      city: location.city,
      country: MARKET_NAMES[market],
      mapsUrl: location.mapsUrl,
      coordinates: { type: "Point" as const, coordinates: [0, 0] },
    }));
  }

  const merchant = await Merchant.findByIdAndUpdate(req.merchantId, update, { new: true });
  return res.json({ merchant });
}
