import { Router } from "express";
import {
  listMerchants,
  listMerchantsForAdmin,
  createMerchant,
  registerMerchant,
  updateMerchant,
  getMerchantForAdmin,
  deleteMerchant,
} from "../controllers/merchantController.js";
import { inviteMerchantUser } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", listMerchants); // public — active merchants only, for Find Merchants
router.get("/admin", requireAuth, requireRole("admin"), listMerchantsForAdmin); // every status, for the review table
router.post("/register", registerMerchant); // public — self-registration, lands as "pending"
router.post("/", requireAuth, requireRole("admin"), createMerchant);
router.get("/:id/admin", requireAuth, requireRole("admin"), getMerchantForAdmin); // full detail view
router.patch("/:id", requireAuth, requireRole("admin"), updateMerchant);
router.delete("/:id", requireAuth, requireRole("admin"), deleteMerchant);
router.post("/:id/invite-user", requireAuth, requireRole("admin"), inviteMerchantUser);

export default router;
