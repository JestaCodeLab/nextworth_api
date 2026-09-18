import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import { renderEmail } from "./emailTemplate.js";

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = "Welcome to Nexworth";

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html: renderEmail({
      previewText: "Your Nexworth account has been created.",
      heading: `Welcome, ${name}`,
      bodyHtml: `
        <p>Thanks for signing up for Nexworth — your account has been created.</p>
        <p>Log in to continue setting up your profile and verification details.</p>
      `,
      cta: { label: "Go to Nexworth", url: env.CLIENT_URL },
    }),
  });
}

export async function sendSetPasswordEmail(to: string, name: string, token: string) {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: "You've been added to Nexworth — set your password",
    html: renderEmail({
      previewText: "Set your password to activate your Nexworth account.",
      heading: `Hi ${name}, set your password`,
      bodyHtml: `
        <p>An admin created a Nexworth account for you. Set a password to get started.</p>
        <p>This link expires in 48 hours.</p>
      `,
      cta: { label: "Set your password", url },
    }),
  });
}
