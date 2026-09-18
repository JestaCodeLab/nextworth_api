import { Router } from "express";
import { listMyTransactions } from "../controllers/transactionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", requireAuth, listMyTransactions);

export default router;
