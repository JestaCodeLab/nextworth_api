import type { Request, Response } from "express";
import { z } from "zod";
import { Merchant, MERCHANT_STATUSES } from "../models/Merchant.js";
import { User, MARKETS } from "../models/User.js";
import { Offer } from "../models/Offer.js";
import { Redemption } from "../models/Redemption.js";
import { VerificationEvent } from "../models/VerificationEvent.js";
import { AuditLog } from "../models/AuditLog.js";
import { Notification } from "../models/Notification.js";
import { resolvePhoneForMarket, MARKET_NAMES, type Market } from "../utils/phone.js";
import { zodErrorMessage } from "../utils/zodError.js";
import { hashPassword } from "../utils/password.js";
import { signToken, decodeTokenExpiry } from "../utils/jwt.js";
import { cookieOptions } from "./authController.js";
import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import type { AuthedRequest } from "../middleware/auth.js";

const locationInputSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  mapsUrl: z.string().url(),
});

// Location name isn't collected from the form — it falls back to the
// merchant's own name. Country is derived from the merchant's market
// (this platform only operates in the two below, so there's nothing for a
// free-text country field to add beyond a typo risk).
function toLocationDoc(location: z.infer<typeof locationInputSchema>, market: Market, label: string) {
  return {
    label,
    address: location.address,
    city: location.city,
    country: MARKET_NAMES[market],
    mapsUrl: location.mapsUrl,
    // No Places/Geocoding API wired up (admin pastes a Maps link instead) —
    // coordinates stay zeroed; the 2dsphere index is unused until that lands.
    coordinates: { type: "Point" as const, coordinates: [0, 0] },
  };
}

const createMerchantSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  country: z.enum(MARKETS),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(6).optional(),
  discountPercent: z.coerce.number().min(0).max(100),
  location: locationInputSchema.optional(),
});

const updateMerchantSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  country: z.enum(MARKETS).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(6).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  location: locationInputSchema.optional(),
  status: z.enum(MERCHANT_STATUSES).optional(),
  rejectionReason: z.string().optional(),
});

// Public self-registration — a bit stricter than the admin create form since
// there's no admin in the loop to fill gaps later: a way to reach the
// merchant and a location are both required up front. No discountPercent
// here — discount codes are now added inside the portal (Offer records),
// not set as a single flat number at signup.
const registerMerchantSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  country: z.enum(MARKETS),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(6),
  password: z.string().min(8),
  location: locationInputSchema,
});

/** Public — only merchants that have cleared review, for the Find Merchants page. */
export async function listMerchants(_req: Request, res: Response) {
  const merchants = await Merchant.find({ status: "active" }).sort({ createdAt: -1 });
  return res.json({ merchants });
}

/** Admin — every merchant regardless of status, for the review/management table. */
export async function listMerchantsForAdmin(_req: AuthedRequest, res: Response) {
  const merchants = await Merchant.find().sort({ createdAt: -1 });
  return res.json({ merchants });
}

export async function createMerchant(req: AuthedRequest, res: Response) {
  const parsed = createMerchantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const { location, country, contactPhone, ...rest } = parsed.data;
  let normalizedPhone = contactPhone;
  if (contactPhone) {
    const resolved = resolvePhoneForMarket(contactPhone, country);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    normalizedPhone = resolved.phone;
  }

  // Admin-added merchants don't need review — they go straight to active.
  const merchant = await Merchant.create({
    ...rest,
    country,
    contactPhone: normalizedPhone,
    status: "active",
    locations: location ? [toLocationDoc(location, country, rest.name)] : [],
  });
  return res.status(201).json({ merchant });
}

/**
 * Public — a merchant registering themselves. The Merchant directory record
 * lands as "pending" for admin review, but unlike an admin-added merchant,
 * self-registration also creates the portal login right away (role:
 * "merchant", linked via merchantId) and signs them in immediately — full
 * access, gated only by contact verification (see requireMerchantContactVerified)
 * and, for adding discount codes specifically, by admin approval.
 */
export async function registerMerchant(req: Request, res: Response) {
  const parsed = registerMerchantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const { location, country, contactPhone, password, ...rest } = parsed.data;
  const resolved = resolvePhoneForMarket(contactPhone, country);
  if (resolved.error) return res.status(400).json({ error: resolved.error });

  const existingLogin = await User.findOne({ email: rest.contactEmail });
  if (existingLogin) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const merchant = await Merchant.create({
    ...rest,
    country,
    contactPhone: resolved.phone,
    status: "pending",
    locations: [toLocationDoc(location, country, rest.name)],
  });

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name: rest.name,
    email: rest.contactEmail,
    phone: resolved.phone,
    passwordHash,
    role: "merchant",
    merchantId: merchant.id,
    status: "verified",
  });

  const token = signToken({ sub: user.id, role: "merchant" });
  res.cookie(env.COOKIE_NAME, token, cookieOptions);

  return res.status(201).json({ merchant, expiresAt: decodeTokenExpiry(token) });
}

export async function updateMerchant(req: AuthedRequest, res: Response) {
  const parsed = updateMerchantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const existing = await Merchant.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  const { location, status, country, contactPhone, ...rest } = parsed.data;
  const effectiveMarket = country ?? (existing.country as Market);

  let normalizedPhone = contactPhone;
  if (contactPhone) {
    const resolved = resolvePhoneForMarket(contactPhone, effectiveMarket);
    if (resolved.error) return res.status(400).json({ error: resolved.error });
    normalizedPhone = resolved.phone;
  }

  const update: Record<string, unknown> = { ...rest };
  if (country) update.country = country;
  if (normalizedPhone) update.contactPhone = normalizedPhone;
  if (location) update.locations = [toLocationDoc(location, effectiveMarket, rest.name ?? existing.name)];
  if (status) {
    update.status = status;
    // A fresh approval/reconsideration clears any prior rejection note.
    if (status !== "rejected" && rest.rejectionReason === undefined) update.rejectionReason = undefined;
  }

  const merchant = await Merchant.findByIdAndUpdate(req.params.id, update, { new: true });

  // First-time approval only (pending -> active) — reactivating a merchant
  // that was previously suspended goes through the same status value but
  // isn't a fresh "approval", so it doesn't re-trigger this.
  if (merchant && status === "active" && existing.status === "pending") {
    const approvalTitle = "Your merchant application has been approved";
    const approvalBody = `Congratulations — ${merchant.name} is now approved and live on Nexworth. You can start adding discount codes from the Discounts tab in your portal.`;

    const portalLogin = await User.findOne({ merchantId: merchant.id });
    if (portalLogin) {
      await Notification.create({
        userId: portalLogin.id,
        type: "merchant_application_approved",
        title: approvalTitle,
        body: approvalBody,
      });
    }

    if (merchant.contactEmail) {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: merchant.contactEmail,
        subject: approvalTitle,
        html: `<p>Hi ${merchant.name},</p><p>${approvalBody}</p>`,
      });
    }
  }

  return res.json({ merchant });
}

/** Admin — full detail view: profile, every offer, portal-login status, and redemption count. */
export async function getMerchantForAdmin(req: AuthedRequest, res: Response) {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  const [offers, portalLogin, redemptionCount] = await Promise.all([
    Offer.find({ merchantId: merchant.id }).sort({ createdAt: -1 }),
    User.findOne({ merchantId: merchant.id }).select("id email contactVerifiedAt"),
    Redemption.countDocuments({ merchantId: merchant.id }),
  ]);

  return res.json({
    merchant,
    offers,
    portalLogin: portalLogin ? { id: portalLogin.id, email: portalLogin.email, contactVerified: Boolean(portalLogin.contactVerifiedAt) } : null,
    redemptionCount,
  });
}

/**
 * Admin — permanently deletes a merchant and every record tied to it: its
 * offers/discount codes, its portal login, verification-scan events, and its
 * redemption history (which also disappears from any member's transaction
 * page, since that's sourced from the same Redemption records). No
 * transaction/session wrapping — matches this codebase's existing pattern of
 * sequential writes rather than Mongo sessions elsewhere.
 */
export async function deleteMerchant(req: AuthedRequest, res: Response) {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  await Promise.all([
    Offer.deleteMany({ merchantId: merchant.id }),
    Redemption.deleteMany({ merchantId: merchant.id }),
    VerificationEvent.deleteMany({ merchantId: merchant.id }),
    User.deleteMany({ merchantId: merchant.id }),
  ]);
  await merchant.deleteOne();

  await AuditLog.create({
    adminUserId: req.userId,
    action: "merchant.delete",
    targetType: "Merchant",
    targetId: merchant.id,
    notes: `deleted "${merchant.name}" and all associated records`,
  });

  return res.status(204).send();
}
