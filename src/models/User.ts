import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const MARKETS = ["GH", "UK"] as const;
export const USER_ROLES = ["user", "admin", "merchant"] as const;
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
    // Set when an admin creates a user (invited to set their own password)
    // or a "forgot password" request is issued. Only the hash is stored —
    // the raw token goes out in the email link. Cleared once consumed.
    passwordResetTokenHash: { type: String, select: false },
    passwordResetTokenExpiresAt: { type: Date, select: false },
    // dob/country/photoUrl/docUploadUrl are collected during the
    // post-registration onboarding verification step, not at registration.
    dob: { type: Date },
    country: { type: String, enum: MARKETS },
    photoUrl: { type: String },
    docUploadUrl: { type: String },
    // Cloudinary public_id/resource_type for the KYC document — kept
    // separately since docUploadUrl alone can't be re-fetched (it's stored
    // as "authenticated" delivery, so a fresh signed URL has to be
    // generated on each admin view; see adminController.getUserDocumentUrl).
    docPublicId: { type: String },
    docResourceType: { type: String },
    role: { type: String, enum: USER_ROLES, default: "user" },
    // Set only for role: "merchant" — links the login to the Merchant
    // directory record it manages (self-service offers/redemption/settings).
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    // Merchant contact-verification (phone or email OTP), distinct from the
    // Merchant record's own admin-review status. Gates entry to the merchant
    // portal at all — see requireMerchantContactVerified.
    contactVerifiedAt: { type: Date },
    verificationChannel: { type: String, enum: ["phone", "email"], select: false },
    verificationCodeHash: { type: String, select: false },
    verificationCodeExpiresAt: { type: Date, select: false },
    verificationAttempts: { type: Number, default: 0, select: false },
    status: { type: String, enum: USER_STATUSES, default: "pending" },
    // Set on rejection so the user can see why; cleared on resubmission/approval.
    rejectionReason: { type: String },
    onboardingComplete: { type: Boolean, default: false },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
    adminNotes: { type: [adminNoteSchema], default: [] },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);
