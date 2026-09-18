import { Router } from "express";
import { notImplemented } from "../controllers/stubController.js";
import { getMyCredential } from "../controllers/credentialController.js";
import { verifyCredential } from "../controllers/verificationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { verificationRateLimit } from "../middleware/rateLimit.js";

// Route surfaces reserved for later increments (see plan roadmap). Real
// handlers land per-increment; kept here so the client can be built against
// a stable API shape now.

export const credentialRouter = Router();
credentialRouter.get("/me", requireAuth, getMyCredential);

export const offerRouter = Router();
offerRouter.get("/", notImplemented);

export const verificationRouter = Router();
verificationRouter.get("/:credentialId", verificationRateLimit, verifyCredential); // public

// audit-log admin view lands in a later increment — users/dashboard/payments
// approve/reject/pricing already moved to admin.routes.ts and payment.routes.ts.
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));
adminRouter.get("/audit-log", notImplemented);
