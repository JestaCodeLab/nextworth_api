import cron from "node-cron";
import { Offer } from "../models/Offer.js";
import { Merchant } from "../models/Merchant.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { SmsLog } from "../models/SmsLog.js";
import { sendSms } from "../utils/sms.js";
import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import { renderEmail } from "../utils/emailTemplate.js";

const REMINDER_WINDOW_DAYS = 7;

/**
 * Warns a merchant before one of their discount codes lapses, so it doesn't
 * silently stop working at checkout. Runs daily; codeReminderSentAt dedupes
 * so the same expiry only ever triggers one reminder (cleared in
 * merchantOfferController whenever the code/validTo changes, so a renewed
 * offer gets its own future reminder).
 */
export async function checkExpiringOffers() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const expiringOffers = await Offer.find({
    isActive: true,
    validTo: { $gte: now, $lte: windowEnd },
    // Matches both "never set" and explicitly-cleared (null) — Mongo treats
    // an equality match against null as covering both cases.
    codeReminderSentAt: null,
  });

  for (const offer of expiringOffers) {
    const merchant = await Merchant.findById(offer.merchantId);
    if (!merchant) continue;

    const expiresOn = offer.validTo!.toDateString();
    const title = "A discount code is about to expire";
    const body = `Your code for "${offer.title}" (${offer.code}) expires on ${expiresOn}. Update it in Discounts before it lapses.`;

    const merchantUser = await User.findOne({ merchantId: merchant.id });
    if (merchantUser) {
      await Notification.create({
        userId: merchantUser.id,
        type: "merchant_discount_code_expiring",
        title,
        body,
      });
    }

    if (merchant.contactPhone) {
      const result = await sendSms(merchant.contactPhone, body, merchant.name);
      await SmsLog.create({
        recipientPhone: merchant.contactPhone,
        recipientName: merchant.name,
        message: body,
        status: result.success ? "sent" : "failed",
        providerMessageId: result.providerMessageId,
        error: result.error,
      });
    }

    if (merchant.contactEmail) {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: merchant.contactEmail,
        subject: title,
        html: renderEmail({
          previewText: body,
          heading: title,
          bodyHtml: `<p>Hi ${merchant.name},</p><p>${body}</p>`,
          cta: { label: "Update your discount codes", url: `${env.CLIENT_URL}/merchant/discounts` },
        }),
      });
    }

    offer.codeReminderSentAt = now;
    await offer.save();
  }

  return expiringOffers.length;
}

export function startOfferExpiryReminderJob() {
  // Once a day at 08:00 server time — no existing cron infra in this
  // codebase to build on, so this runs in-process rather than standing up
  // separate scheduling infrastructure.
  cron.schedule("0 8 * * *", () => {
    checkExpiringOffers().catch((err) => console.error("[offerExpiryReminder] failed", err));
  });
}
