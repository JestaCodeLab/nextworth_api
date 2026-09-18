import type { Response } from "express";
import { z } from "zod";
import { Offer, DISCOUNT_TYPES } from "../models/Offer.js";
import { Merchant } from "../models/Merchant.js";
import { zodErrorMessage } from "../utils/zodError.js";
import type { AuthedRequest } from "../middleware/auth.js";

const offerInputSchema = z.object({
  title: z.string().min(2),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.coerce.number().positive(),
  code: z.string().min(2),
  minimumPurchaseAmount: z.coerce.number().min(0).optional(),
  terms: z.string().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});

const updateOfferSchema = offerInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});

/** Every offer this merchant owns, active or not — so they can see/edit expired ones too. */
export async function listMyOffers(req: AuthedRequest, res: Response) {
  const offers = await Offer.find({ merchantId: req.merchantId }).sort({ createdAt: -1 });
  return res.json({ offers });
}

export async function createMyOffer(req: AuthedRequest, res: Response) {
  const parsed = offerInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const merchant = await Merchant.findById(req.merchantId);
  if (merchant?.status !== "active") {
    return res.status(403).json({ error: "Your application is still under review — you can add discount codes once it's approved" });
  }

  const offer = await Offer.create({
    ...parsed.data,
    merchantId: req.merchantId,
    redemptionMethod: "code",
  });
  return res.status(201).json({ offer });
}

export async function updateMyOffer(req: AuthedRequest, res: Response) {
  const parsed = updateOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const existing = await Offer.findOne({ _id: req.params.id, merchantId: req.merchantId });
  if (!existing) {
    return res.status(404).json({ error: "Offer not found" });
  }

  const { code, validTo, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  if (code !== undefined) update.code = code;
  if (validTo !== undefined) update.validTo = validTo;
  // A renewed code or a pushed-out expiry deserves its own future reminder.
  // Explicit null (not undefined, which findByIdAndUpdate would silently drop).
  if (code !== undefined || validTo !== undefined) update.codeReminderSentAt = null;

  const offer = await Offer.findByIdAndUpdate(existing.id, update, { new: true });
  return res.json({ offer });
}

export async function deleteMyOffer(req: AuthedRequest, res: Response) {
  const existing = await Offer.findOne({ _id: req.params.id, merchantId: req.merchantId });
  if (!existing) {
    return res.status(404).json({ error: "Offer not found" });
  }

  existing.isActive = false;
  await existing.save();
  return res.status(204).send();
}
