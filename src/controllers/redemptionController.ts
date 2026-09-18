import type { Response } from "express";
import { z } from "zod";
import { Credential } from "../models/Credential.js";
import { User } from "../models/User.js";
import { Merchant } from "../models/Merchant.js";
import { Offer } from "../models/Offer.js";
import { Redemption } from "../models/Redemption.js";
import { VerificationEvent } from "../models/VerificationEvent.js";
import { computeResult } from "./verificationController.js";
import { zodErrorMessage } from "../utils/zodError.js";
import type { AuthedRequest } from "../middleware/auth.js";

type OfferStatus = "valid" | "expired" | "not_started";

function computeOfferStatus(offer: { validFrom?: Date | null; validTo?: Date | null }): OfferStatus {
  const now = Date.now();
  if (offer.validTo && offer.validTo.getTime() < now) return "expired";
  if (offer.validFrom && offer.validFrom.getTime() > now) return "not_started";
  return "valid";
}

/**
 * Merchant-authenticated: looks up a member by their credentialCode (the
 * short code designed for manual/POS entry) and returns their credential
 * validity plus the calling merchant's own offers — each tagged with its own
 * independent status, since a valid member card can hit a merchant whose own
 * offer has lapsed and vice versa. Distinct from the public GET
 * /verify/:credentialId — that one has no merchant context and never
 * exposes an offer's private code.
 */
export async function redeemLookup(req: AuthedRequest, res: Response) {
  const credential = await Credential.findOne({ credentialCode: req.params.credentialCode });
  if (!credential) {
    return res.status(404).json({ error: "Credential not found" });
  }

  const member = await User.findById(credential.userId);
  const result = computeResult(credential.status, credential.expiresAt);

  await VerificationEvent.create({
    credentialId: credential.id,
    merchantId: req.merchantId,
    result,
    ipAddress: req.ip,
  });

  const offers = await Offer.find({ merchantId: req.merchantId, isActive: true }).sort({ createdAt: -1 });

  return res.json({
    result,
    holder: {
      name: member?.name ?? "Unknown",
      photoUrl: member?.photoUrl ?? null,
    },
    credential: {
      id: credential.id,
      status: credential.status,
      expiresAt: credential.expiresAt,
    },
    offers: offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      code: offer.code,
      minimumPurchaseAmount: offer.minimumPurchaseAmount,
      validTo: offer.validTo,
      status: computeOfferStatus(offer),
    })),
  });
}

const redeemSchema = z.object({
  credentialId: z.string().min(1),
  offerId: z.string().min(1),
  amountRedeemed: z.coerce.number().min(0),
  locationId: z.string().min(1).optional(),
});

/**
 * Merchant-authenticated: records that a member's discount was actually
 * applied at checkout. This click is the sole signal Nexworth has that a
 * transaction happened — there's no live POS integration, so amountRedeemed
 * (the discount given, not the sale total) is stored as entered with no
 * mismatch check against the offer's own numbers.
 */
export async function redeem(req: AuthedRequest, res: Response) {
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }
  const { credentialId, offerId, amountRedeemed, locationId } = parsed.data;

  const [credential, merchant, offer] = await Promise.all([
    Credential.findById(credentialId),
    Merchant.findById(req.merchantId),
    Offer.findOne({ _id: offerId, merchantId: req.merchantId }),
  ]);

  if (!credential) return res.status(404).json({ error: "Credential not found" });
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });
  if (!offer) return res.status(400).json({ error: "This offer doesn't belong to you" });
  if (computeOfferStatus(offer) !== "valid") {
    return res.status(400).json({ error: "This discount code isn't currently valid" });
  }

  let location = null;
  if (merchant.locations.length > 1) {
    if (!locationId) return res.status(400).json({ error: "Select which location this sale is at" });
    location = merchant.locations.id(locationId);
    if (!location) return res.status(400).json({ error: "That location doesn't belong to you" });
  } else if (merchant.locations.length === 1) {
    location = merchant.locations[0];
  }

  const redemption = await Redemption.create({
    userId: credential.userId,
    credentialId: credential.id,
    merchantId: merchant.id,
    merchantName: merchant.name,
    locationLabel: location?.label,
    locationAddress: location?.address,
    offerId: offer.id,
    offerTitle: offer.title,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    code: offer.code,
    minimumPurchaseAmount: offer.minimumPurchaseAmount,
    amountRedeemed,
    redeemedByUserId: req.userId,
  });

  return res.status(201).json({ redemption });
}
