import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const MERCHANT_STATUSES = ["active", "inactive"] as const;

const locationSchema = new Schema(
  {
    label: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    country: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { _id: false },
);

const merchantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String },
    logoUrl: { type: String },
    locations: { type: [locationSchema], default: [] },
    status: { type: String, enum: MERCHANT_STATUSES, default: "active" },
  },
  { timestamps: true },
);

merchantSchema.index({ "locations.coordinates": "2dsphere" });

export type MerchantDoc = HydratedDocument<InferSchemaType<typeof merchantSchema>>;

export const Merchant = model("Merchant", merchantSchema);
