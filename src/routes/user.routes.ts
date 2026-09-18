import { Router } from "express";
import {
  submitVerification,
  completeOnboarding,
  updateNotificationPreferences,
  updateProfile,
  updateProfilePhoto,
  changePassword,
} from "../controllers/userController.js";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadKycFiles, uploadProfilePhoto } from "../middleware/upload.js";

const router = Router();

router.patch("/me", requireAuth, updateProfile);
router.patch("/me/photo", requireAuth, uploadProfilePhoto, updateProfilePhoto);
router.patch("/me/password", requireAuth, changePassword);
router.patch("/me/verification", requireAuth, uploadKycFiles, submitVerification);
router.post("/me/onboarding-complete", requireAuth, completeOnboarding);
router.patch("/me/notification-preferences", requireAuth, updateNotificationPreferences);
router.get("/me/notifications", requireAuth, listNotifications);
router.patch("/me/notifications/:id/read", requireAuth, markNotificationRead);
router.post("/me/notifications/read-all", requireAuth, markAllNotificationsRead);

export default router;
