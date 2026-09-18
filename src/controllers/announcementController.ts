import type { Response } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { Merchant } from "../models/Merchant.js";
import { AuditLog } from "../models/AuditLog.js";
import { SmsLog } from "../models/SmsLog.js";
import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import { renderEmail } from "../utils/emailTemplate.js";
import { sendSms } from "../utils/sms.js";
import { zodErrorMessage } from "../utils/zodError.js";
import type { AuthedRequest } from "../middleware/auth.js";

const baseSchema = z.object({
  recipientType: z.enum(["users", "merchants"]),
  recipientIds: z.array(z.string()).min(1),
  message: z.string().min(1),
});

const sendEmailSchema = baseSchema.extend({ subject: z.string().min(1) });

// SMS-only: lets an admin text a number that isn't in the system yet (e.g.
// following up with someone before they've registered), bypassing the
// users/merchants picker entirely.
const smsManualSchema = z.object({
  recipientType: z.literal("manual"),
  phoneNumbers: z.array(z.string().min(4)).min(1),
  message: z.string().min(1),
});
const sendSmsSchema = z.union([baseSchema, smsManualSchema]);

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
}

async function resolveRecipients(recipientType: "users" | "merchants", recipientIds: string[]): Promise<Recipient[]> {
  if (recipientType === "users") {
    const users = await User.find({ _id: { $in: recipientIds } }).select("name email phone");
    return users.map((u) => ({ name: u.name, email: u.email, phone: u.phone }));
  }
  const merchants = await Merchant.find({ _id: { $in: recipientIds } }).select("name contactEmail contactPhone");
  return merchants.map((m) => ({ name: m.name, email: m.contactEmail ?? undefined, phone: m.contactPhone ?? undefined }));
}

export async function sendEmailAnnouncement(req: AuthedRequest, res: Response) {
  const parsed = sendEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }
  const { recipientType, recipientIds, subject, message } = parsed.data;

  const recipients = await resolveRecipients(recipientType, recipientIds);
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!recipient.email) {
      failed += 1;
      continue;
    }
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: recipient.email,
        subject,
        html: renderEmail({
          previewText: message,
          heading: subject,
          bodyHtml: `<p>Hi ${recipient.name},</p><p>${message}</p>`,
        }),
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  await AuditLog.create({
    adminUserId: req.userId,
    action: "communication.email",
    targetType: recipientType === "users" ? "User" : "Merchant",
    notes: `email to ${recipients.length} ${recipientType} — "${subject}"`,
  });

  return res.json({ recipientCount: recipients.length, sent, failed });
}

export async function sendSmsAnnouncement(req: AuthedRequest, res: Response) {
  const parsed = sendSmsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }
  const { recipientType, message } = parsed.data;

  const recipients: Recipient[] =
    recipientType === "manual"
      ? parsed.data.phoneNumbers.map((phone) => ({ name: phone, phone }))
      : await resolveRecipients(recipientType, parsed.data.recipientIds);
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!recipient.phone) {
      failed += 1;
      await SmsLog.create({
        recipientPhone: "—",
        recipientName: recipient.name,
        message,
        status: "failed",
        error: "No phone number on file",
      });
      continue;
    }

    const result = await sendSms(recipient.phone, message, recipient.name);
    if (result.success) {
      sent += 1;
    } else {
      failed += 1;
    }

    await SmsLog.create({
      recipientPhone: recipient.phone,
      recipientName: recipient.name,
      message,
      status: result.success ? "sent" : "failed",
      providerMessageId: result.providerMessageId,
      error: result.error,
    });
  }

  await AuditLog.create({
    adminUserId: req.userId,
    action: "communication.sms",
    targetType: recipientType === "users" ? "User" : recipientType === "merchants" ? "Merchant" : "Manual",
    notes: `sms to ${recipients.length} ${recipientType}`,
  });

  return res.json({ recipientCount: recipients.length, sent, failed });
}
