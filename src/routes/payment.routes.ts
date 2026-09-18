import { Router } from "express";
import {
  initializePayment,
  paystackWebhook,
  getMyLatestPayment,
  listMyPayments,
  getMyPricing,
  verifyPayment,
} from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/pricing/me", requireAuth, getMyPricing);
router.post("/initialize", requireAuth, initializePayment);
router.post("/verify/:reference", requireAuth, verifyPayment);
router.post("/webhook", paystackWebhook); // public — verified via Paystack signature, not auth
router.get("/me/latest", requireAuth, getMyLatestPayment);
router.get("/me", requireAuth, listMyPayments);

export default router;
