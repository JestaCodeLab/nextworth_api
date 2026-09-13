import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const MARKETS = ["GH", "UK"] as const;
export const USER_ROLES = ["user", "admin"] as const;
export const USER_STATUSES = ["pending", "verified", "rejected"] as const;

const adminNoteSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, required: true },
  },
  { timestamps: true, _id: false },
);

const notificationPreferencesSchema = new Schema(
  {
    offersAndPromotions: { type: Boolean, default: true },
    accountUpdates: { type: Boolean, default: true },
    newPartners: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    transactions: { type: Boolean, default: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, required: true },
    // dob/country/photoUrl/docUploadUrl are collected during the
    // post-registration onboarding verification step, not at registration.
    dob: { type: Date },
    country: { type: String, enum: MARKETS },
    photoUrl: { type: String },
    docUploadUrl: { type: String },
    role: { type: String, enum: USER_ROLES, default: "user" },
    status: { type: String, enum: USER_STATUSES, default: "pending" },
    onboardingComplete: { type: Boolean, default: false },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
    adminNotes: { type: [adminNoteSchema], default: [] },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
