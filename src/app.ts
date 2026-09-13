import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminActionRoutes from "./routes/admin.routes.js";
import {
  credentialRouter,
  merchantRouter,
  offerRouter,
  verificationRouter,
  adminRouter,
  paymentRouter,
} from "./routes/stub.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/credentials", credentialRouter);
app.use("/merchants", merchantRouter);
app.use("/offers", offerRouter);
app.use("/verify", verificationRouter);
app.use("/admin", adminActionRoutes);
app.use("/admin", adminRouter);
app.use("/payments", paymentRouter);

export default app;
