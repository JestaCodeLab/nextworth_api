import type { Response } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { Merchant } from "../models/Merchant.js";
import { SmsLog } from "../models/SmsLog.js";
import { generateOtp, hashOtp } from "../utils/otp.js";
import { sendSms } from "../utils/sms.js";
import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import { renderEmail, emailCodeBlock } from "../utils/emailTemplate.js";
import { zodErrorMessage } from "../utils/zodError.js";
import type { AuthedRequest } from "../middleware/auth.js";

const MAX_ATTEMPTS = 5;

const sendCodeSchema = z.object({
  channel: z.enum(["phone", "email"]),
});

/** Masks all but the last 2-4 characters, so the UI can confirm "where" without showing the full contact value. */
function mask(value: string): string {
  const visible = value.length > 6 ? 4 : 2;
  return `${"•".repeat(Math.max(value.length - visible, 0))}${value.slice(-visible)}`;
}

export async function sendVerificationCode(req: AuthedRequest, res: Response) {
  const parsed = sendCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const merchant = await Merchant.findById(req.merchantId);
  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  const { channel } = parsed.data;
  const destination = channel === "phone" ? merchant.contactPhone : merchant.contactEmail;
  if (!destination) {
    return res.status(400).json({ error: `No contact ${channel} on file` });
  }

  const { code, codeHash, expiresAt } = generateOtp();

  await User.findByIdAndUpdate(req.userId, {
    verificationChannel: channel,
    verificationCodeHash: codeHash,
    verificationCodeExpiresAt: expiresAt,
    verificationAttempts: 0,
  });

  if (channel === "phone") {
    const message = `Your Nexworth merchant verification code is ${code}. It expires in 10 minutes.`;
    const result = await sendSms(destination, message, merchant.name);
    await SmsLog.create({
      recipientPhone: destination,
      recipientName: merchant.name,
      message,
      status: result.success ? "sent" : "failed",
      providerMessageId: result.providerMessageId,
      error: result.error,
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error ?? "Couldn't send the code — try email instead" });
    }
  } else {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: destination,
      subject: "Your Nexworth verification code",
      html: renderEmail({
        previewText: `Your verification code is ${code}.`,
        heading: `Hi ${merchant.name}, here's your code`,
        bodyHtml: `<p>Enter this code to verify your contact details. It expires in 10 minutes.</p>${emailCodeBlock(code)}`,
      }),
    });
  }

  return res.json({ channel, maskedDestination: mask(destination) });
}

const confirmCodeSchema = z.object({
  code: z.string().min(1),
});

export async function confirmVerificationCode(req: AuthedRequest, res: Response) {
  const parsed = confirmCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: zodErrorMessage(parsed.error) });
  }

  const user = await User.findById(req.userId).select(
    "+verificationChannel +verificationCodeHash +verificationCodeExpiresAt +verificationAttempts",
  );
  if (!user?.verificationCodeHash || !user.verificationCodeExpiresAt) {
    return res.status(400).json({ error: "Request a verification code first" });
  }
  if (user.verificationCodeExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "This code has expired — request a new one" });
  }
  if (user.verificationAttempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many attempts — request a new code" });
  }

  if (hashOtp(parsed.data.code) !== user.verificationCodeHash) {
    user.verificationAttempts += 1;
    await user.save();
    return res.status(400).json({ error: "Incorrect code" });
  }

  user.contactVerifiedAt = new Date();
  user.verificationChannel = undefined;
  user.verificationCodeHash = undefined;
  user.verificationCodeExpiresAt = undefined;
  user.verificationAttempts = 0;
  await user.save();

  return res.json({ ok: true });
}
