import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const PAYMENT_STATUSES = ["pending", "confirmed", "failed", "refund-flagged"] as const;
export const CURRENCIES = ["GHS", "USD"] as const;

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: CURRENCIES, required: true },
    provider: { type: String, default: "paystack" },
    providerRef: { type: String },
    status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
  },
  { timestamps: true },
);

export type PaymentDoc = HydratedDocument<InferSchemaType<typeof paymentSchema>>;

export const Payment = model("Payment", paymentSchema);
