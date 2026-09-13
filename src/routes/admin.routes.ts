import { Router } from "express";
import { approveUser, rejectUser } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.post("/users/:id/approve", approveUser);
router.post("/users/:id/reject", rejectUser);

export default router;
