import type { Response } from "express";
import { z } from "zod";
import { User, MARKETS } from "../models/User.js";
import { getOnboardingStep } from "../utils/onboarding.js";
import { zodErrorMessage } from "../utils/zodError.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { createNotification } from "../utils/notifications.js";
import { resolvePhoneForMarket } from "../utils/phone.js";
import type { AuthedRequest } from "../middleware/auth.js";

const verificationSchema = z.object({
  dob: z.coerce.date(),
  country: z.enum(MARKETS),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const notificationPreferencesSchema = z.object({
  offersAndPromotions: z.boolean().optional(),
  accountUpdates: z.boolean().optional(),
  newPartners: z.boolean().optional(),
  reminders: z.boolean().optional(),
  transactions: z.boolean().optional(),
});

export async function submitVerification(req: AuthedRequest, res: Response) {
  const parsed = verificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const files = req.files as { photo?: Express.Multer.File[]; document?: Express.Multer.File[] } | undefined;
  const photo = files?.photo?.[0];
  const document = files?.document?.[0];
  if (!photo || !document) {
    return res.status(400).json({ error: "Both a photo and an ID document are required" });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (user.status === "verified") {
    return res.status(409).json({ error: "Your account is already verified" });
  }

  const isResubmission = user.status === "rejected";

  user.dob = parsed.data.dob;
  user.country = parsed.data.country;
  // The phone was collected at sign-up, before the market was known —
  // reformat it to the right calling code now that we have both. No phone
  // field on this step to surface a mismatch error against, so this is a
  // best-effort normalize rather than a hard validation failure.
  user.phone = resolvePhoneForMarket(user.phone, parsed.data.country).phone;
  user.photoUrl = photo.path;
  user.docUploadUrl = document.path;
  user.docPublicId = document.filename;
  user.docResourceType = document.resourceType;
  user.status = "pending";
  user.rejectionReason = undefined;
  await user.save();

  if (isResubmission) {
    await createNotification(
      user.id,
      "generic",
      "Documents resubmitted",
      "Your updated documents were submitted for review. We'll notify you once they've been reviewed.",
    );
  }

  return res.json({
    user: {
      id: user.id,
      dob: user.dob,
      country: user.country,
      status: user.status,
      onboardingStep: getOnboardingStep(user),
    },
  });
}

export async function completeOnboarding(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (getOnboardingStep(user) === "verification") {
    return res.status(400).json({ error: "Submit your verification details before finishing onboarding" });
  }

  user.onboardingComplete = true;
  await user.save();

  return res.json({
    user: {
      id: user.id,
      onboardingStep: getOnboardingStep(user),
    },
  });
}

export async function updateNotificationPreferences(req: AuthedRequest, res: Response) {
  const parsed = notificationPreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  user.notificationPreferences = { ...user.notificationPreferences, ...parsed.data };
  await user.save();

  return res.json({ notificationPreferences: user.notificationPreferences });
}

export async function updateProfile(req: AuthedRequest, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (parsed.data.email && parsed.data.email !== user.email) {
    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
  }

  Object.assign(user, parsed.data);
  await user.save();

  await createNotification(
    user.id,
    "profile_updated",
    "Profile updated",
    "Your personal information was updated successfully.",
  );

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  });
}

export async function updateProfilePhoto(req: AuthedRequest, res: Response) {
  const photo = req.file;
  if (!photo) {
    return res.status(400).json({ error: "A photo is required" });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  user.photoUrl = photo.path;
  await user.save();

  await createNotification(
    user.id,
    "profile_updated",
    "Profile photo updated",
    "Your profile photo was updated successfully.",
  );

  return res.json({ user: { id: user.id, photoUrl: user.photoUrl } });
}

export async function changePassword(req: AuthedRequest, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  user.passwordHash = await hashPassword(parsed.data.newPassword);
  await user.save();

  await createNotification(
    user.id,
    "password_changed",
    "Password changed",
    "Your password was changed successfully. If this wasn't you, contact support immediately.",
  );

  return res.status(204).send();
}
