import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { MARKETS } from "./User.js";

// pending: awaiting admin review (self-registered via the public link).
// active: approved and shown on Find Merchants. inactive: suspended after
// having been active. rejected: declined during review.
export const MERCHANT_STATUSES = ["pending", "active", "inactive", "rejected"] as const;

const locationSchema = new Schema(
  {
    label: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    country: { type: String, required: true },
    // Plain Google Maps share link — no Places/Geocoding API wired up, so
    // this is admin-pasted rather than autocompleted or validated.
    mapsUrl: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  // Each location keeps its own _id (unlike most subdocuments here) so the
  // merchant redemption flow can reference "which location" a sale was at.
);

const merchantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String },
    logoUrl: { type: String },
    // The merchant's operating market — drives which calling code its
    // contactPhone is normalized to, and the country shown on its location.
    country: { type: String, enum: MARKETS, required: true },
    // Used to reach the merchant directly — admin announcements, etc.
    contactEmail: { type: String },
    contactPhone: { type: String },
    locations: { type: [locationSchema], default: [] },
    status: { type: String, enum: MERCHANT_STATUSES, default: "pending" },
    // How much the merchant discounts platform members, as a flat percentage.
    discountPercent: { type: Number, min: 0, max: 100 },
    rejectionReason: { type: String },
  },
  {
    timestamps: true,
    // The client (admin table, Find Merchants) addresses merchants by `id`,
    // matching how Users are already serialized — plain res.json(doc) would
    // otherwise only expose Mongo's `_id`.
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

merchantSchema.index({ "locations.coordinates": "2dsphere" });

export type MerchantDoc = HydratedDocument<InferSchemaType<typeof merchantSchema>>;

export const Merchant = model("Merchant", merchantSchema);
