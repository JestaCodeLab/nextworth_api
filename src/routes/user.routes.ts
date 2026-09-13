import { Router } from "express";
import { submitVerification, completeOnboarding, updateNotificationPreferences } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadKycFiles } from "../middleware/upload.js";

const router = Router();

router.patch("/me/verification", requireAuth, uploadKycFiles, submitVerification);
router.post("/me/onboarding-complete", requireAuth, completeOnboarding);
router.patch("/me/notification-preferences", requireAuth, updateNotificationPreferences);

export default router;
