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

export const merchantRouter = Router();
merchantRouter.get("/", notImplemented); // public list/map data
merchantRouter.post("/", requireAuth, requireRole("admin"), notImplemented);

export const offerRouter = Router();
offerRouter.get("/", notImplemented);

export const verificationRouter = Router();
verificationRouter.get("/:credentialId", verificationRateLimit, verifyCredential); // public

// User-list/dashboard/audit-log admin views land in the admin panel
// increment — approve/reject already moved to admin.routes.ts.
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));
adminRouter.get("/users", notImplemented);
adminRouter.get("/dashboard", notImplemented);
adminRouter.get("/audit-log", notImplemented);

export const paymentRouter = Router();
paymentRouter.post("/", requireAuth, notImplemented);
