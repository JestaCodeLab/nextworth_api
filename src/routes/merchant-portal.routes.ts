import { Router } from "express";
import { getMyMerchant, updateMyMerchant } from "../controllers/merchantAccountController.js";
import { listMyOffers, createMyOffer, updateMyOffer, deleteMyOffer } from "../controllers/merchantOfferController.js";
import { redeemLookup, redeem } from "../controllers/redemptionController.js";
import { sendVerificationCode, confirmVerificationCode } from "../controllers/merchantVerificationController.js";
import { requireAuth, requireRole, requireMerchantContactVerified } from "../middleware/auth.js";

// Merchant-authenticated self-service surface — mounted at /merchant
// (singular; the existing /merchants router is the public/admin directory).
const router = Router();
router.use(requireAuth, requireRole("merchant"));

// Contact verification itself has to be reachable before it's done — every
// other route below requires it.
router.post("/verification/send", sendVerificationCode);
router.post("/verification/confirm", confirmVerificationCode);

router.use(requireMerchantContactVerified);

router.get("/me", getMyMerchant);
router.patch("/me", updateMyMerchant);

router.get("/offers", listMyOffers);
router.post("/offers", createMyOffer);
router.patch("/offers/:id", updateMyOffer);
router.delete("/offers/:id", deleteMyOffer);

router.get("/redeem-lookup/:credentialCode", redeemLookup);
router.post("/redeem", redeem);

export default router;
