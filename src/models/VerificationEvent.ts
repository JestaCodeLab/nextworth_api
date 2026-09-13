import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const VERIFICATION_RESULTS = ["valid", "suspended", "expired", "invalid"] as const;

const verificationEventSchema = new Schema(
  {
    credentialId: { type: Schema.Types.ObjectId, ref: "Credential", required: true },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    scannedAt: { type: Date, default: Date.now },
    result: { type: String, enum: VERIFICATION_RESULTS, required: true },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

export type VerificationEventDoc = HydratedDocument<InferSchemaType<typeof verificationEventSchema>>;

export const VerificationEvent = model("VerificationEvent", verificationEventSchema);
