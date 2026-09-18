import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env, corsOrigins } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminActionRoutes from "./routes/admin.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import merchantRoutes from "./routes/merchant.routes.js";
import merchantPortalRoutes from "./routes/merchant-portal.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import { credentialRouter, offerRouter, verificationRouter, adminRouter } from "./routes/stub.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(
  express.json({
    // Stashes the raw body for the Paystack webhook's HMAC signature check
    // (payment.routes.ts) — the parsed body alone isn't enough to verify it.
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/credentials", credentialRouter);
app.use("/merchants", merchantRoutes);
app.use("/merchant", merchantPortalRoutes);
app.use("/offers", offerRouter);
app.use("/verify", verificationRouter);
app.use("/admin", adminActionRoutes);
app.use("/admin", adminRouter);
app.use("/payments", paymentRoutes);
app.use("/transactions", transactionRoutes);

export default app;
