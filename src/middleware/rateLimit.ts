import rateLimit from "express-rate-limit";

// Guards the public verification endpoint against credential-ID enumeration,
// per the brief's explicit anti-enumeration requirement (§7.4).
export const verificationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please try again shortly." },
});
