import type { Response } from "express";
import { z } from "zod";
import { User, MARKETS } from "../models/User.js";
import { getOnboardingStep } from "../utils/onboarding.js";
import { zodErrorMessage } from "../utils/zodError.js";
import type { AuthedRequest } from "../middleware/auth.js";

const verificationSchema = z.object({
  dob: z.coerce.date(),
  country: z.enum(MARKETS),
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

  user.dob = parsed.data.dob;
  user.country = parsed.data.country;
  user.photoUrl = photo.path;
  user.docUploadUrl = document.path;
  await user.save();

  return res.json({
    user: {
      id: user.id,
      dob: user.dob,
      country: user.country,
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
