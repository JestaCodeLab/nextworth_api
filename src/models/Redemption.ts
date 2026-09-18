import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { DISCOUNT_TYPES } from "./Offer.js";

const redemptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    credentialId: { type: Schema.Types.ObjectId, ref: "Credential", required: true },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    // Snapshots below freeze what was true at redemption time, independent
    // of later edits to the Merchant/Offer/location documents.
    merchantName: { type: String, required: true },
    locationLabel: { type: String },
    locationAddress: { type: String },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    offerTitle: { type: String, required: true },
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true },
    code: { type: String, required: true },
    minimumPurchaseAmount: { type: Number },
    // The dollar value of the discount actually given at checkout — merchant
    // entered, not the sale total, and not validated against discountValue/
    // minimumPurchaseAmount (recorded for reporting only).
    amountRedeemed: { type: Number, required: true, min: 0 },
    redeemedAt: { type: Date, default: Date.now },
    redeemedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verificationEventId: { type: Schema.Types.ObjectId, ref: "VerificationEvent" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

export type RedemptionDoc = HydratedDocument<InferSchemaType<typeof redemptionSchema>>;

export const Redemption = model("Redemption", redemptionSchema);
