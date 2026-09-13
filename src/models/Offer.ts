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
    validFrom: { type: Date },
    validTo: { type: Date },
    // V1 note: offers are not browsable individually yet — only the discount
    // summary (title/discountType/discountValue) is surfaced on the merchant
    // map/list. Full offer detail pages are a Phase 2 feature.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type OfferDoc = HydratedDocument<InferSchemaType<typeof offerSchema>>;

export const Offer = model("Offer", offerSchema);
