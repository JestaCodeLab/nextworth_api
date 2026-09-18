import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { MARKETS } from "./User.js";
import { CURRENCIES } from "./Payment.js";

const pricingConfigSchema = new Schema(
  {
    market: { type: String, enum: MARKETS, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: CURRENCIES, required: true },
  },
  { timestamps: true },
);

export type PricingConfigDoc = HydratedDocument<InferSchemaType<typeof pricingConfigSchema>>;

export const PricingConfig = model("PricingConfig", pricingConfigSchema);
