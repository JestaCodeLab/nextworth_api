import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const SMS_LOG_STATUSES = ["sent", "failed"] as const;

const smsLogSchema = new Schema(
  {
    recipientPhone: { type: String, required: true },
    recipientName: { type: String },
    message: { type: String, required: true },
    status: { type: String, enum: SMS_LOG_STATUSES, required: true },
    providerMessageId: { type: String },
    error: { type: String },
  },
  { timestamps: true },
);

export type SmsLogDoc = HydratedDocument<InferSchemaType<typeof smsLogSchema>>;

export const SmsLog = model("SmsLog", smsLogSchema);
