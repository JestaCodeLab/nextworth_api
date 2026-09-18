import { Router } from "express";
import { register, login, logout, me, setPassword, refreshSession } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/refresh", requireAuth, refreshSession); // re-issues the session token — "Stay logged in"
router.post("/set-password", setPassword); // public — token-gated, used by admin-invite and (future) forgot-password links

export default router;
