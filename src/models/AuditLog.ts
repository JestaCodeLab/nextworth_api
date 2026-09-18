import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const auditLogSchema = new Schema(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g. "user.approve", "credential.suspend"
    targetType: { type: String, required: true }, // e.g. "User", "Credential", "Merchant"
    // Optional — broadcast-style actions (e.g. an announcement sent to many
    // recipients) have no single target.
    targetId: { type: Schema.Types.ObjectId },
    notes: { type: String },
  },
  { timestamps: true },
);

export type AuditLogDoc = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;

export const AuditLog = model("AuditLog", auditLogSchema);
