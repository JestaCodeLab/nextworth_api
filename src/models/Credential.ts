import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { MARKETS } from "./User.js";

export const CREDENTIAL_STATUSES = ["pending", "active", "suspended", "expired"] as const;

const credentialSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    credentialId: { type: String, required: true, unique: true },
    credentialCode: { type: String, required: true, unique: true },
    qrPayload: { type: String, required: true },
    status: { type: String, enum: CREDENTIAL_STATUSES, default: "pending" },
    market: { type: String, enum: MARKETS, required: true },
    issuedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

export type CredentialDoc = HydratedDocument<InferSchemaType<typeof credentialSchema>>;

export const Credential = model("Credential", credentialSchema);
