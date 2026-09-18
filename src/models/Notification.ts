import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const NOTIFICATION_TYPES = [
  "profile_updated",
  "password_changed",
  "generic",
  "merchant_discount_code_expiring",
  "merchant_application_approved",
] as const;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "generic" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type NotificationDoc = HydratedDocument<InferSchemaType<typeof notificationSchema>>;

export const Notification = model("Notification", notificationSchema);
