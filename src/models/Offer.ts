import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const DISCOUNT_TYPES = ["percentage", "fixed"] as const;
export const REDEMPTION_METHODS = ["qr", "code", "link"] as const;

const offerSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    title: { type: String, required: true },
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true },
    terms: { type: String },
    isOnline: { type: Boolean, default: false },
    redemptionMethod: { type: String, enum: REDEMPTION_METHODS, default: "code" },
    // The merchant's own private code for this offer — what they key into
    // their own register/POS. Nexworth only ever displays it back to the
    // merchant on the redemption screen; never exposed on the public offer
    // summary below.
    code: { type: String },
    // Sale must be at least this much for the merchant to apply this offer —
    // informational only, not enforced server-side (see Redemption.amountRedeemed).
    minimumPurchaseAmount: { type: Number, min: 0 },
    validFrom: { type: Date },
    validTo: { type: Date },
    // Tracks whether the expiry-reminder job has already warned the merchant
    // for the current validTo — cleared whenever code/validTo changes so a
    // renewed offer gets its own future reminder.
    codeReminderSentAt: { type: Date },
    // V1 note: offers are not browsable individually yet — only the discount
    // summary (title/discountType/discountValue) is surfaced on the merchant
    // map/list. Full offer detail pages are a Phase 2 feature. `code` and
    // `minimumPurchaseAmount` must never be included in that public summary.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type OfferDoc = HydratedDocument<InferSchemaType<typeof offerSchema>>;

export const Offer = model("Offer", offerSchema);
