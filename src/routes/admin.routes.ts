import { Router } from "express";
import {
  approveUser,
  rejectUser,
  getDashboardStats,
  listUsers,
  createUserByAdmin,
  resendInvite,
  updateUserByAdmin,
  getUserDocumentUrl,
  suspendCredential,
  reactivateCredential,
} from "../controllers/adminController.js";
import { listPayments } from "../controllers/paymentController.js";
import { listPricing, updatePricing } from "../controllers/pricingController.js";
import { sendEmailAnnouncement, sendSmsAnnouncement } from "../controllers/announcementController.js";
import { getSmsOverview, getSmsStatus } from "../controllers/smsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/users", listUsers);
router.post("/users", createUserByAdmin);
router.post("/users/:id/resend-invite", resendInvite);
router.patch("/users/:id", updateUserByAdmin);
router.get("/users/:id/document", getUserDocumentUrl);
router.post("/users/:id/approve", approveUser);
router.post("/users/:id/reject", rejectUser);
router.post("/users/:id/credential/suspend", suspendCredential);
router.post("/users/:id/credential/reactivate", reactivateCredential);
router.get("/payments", listPayments);
router.get("/pricing", listPricing);
router.patch("/pricing/:market", updatePricing);
router.post("/communication/email", sendEmailAnnouncement);
router.post("/communication/sms", sendSmsAnnouncement);
router.get("/sms/overview", getSmsOverview);
router.get("/sms/status", getSmsStatus);

export default router;
