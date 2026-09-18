import { resend } from "../config/resend.js";
import { env } from "../config/env.js";

export async function sendSetPasswordEmail(to: string, name: string, token: string) {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: "You've been added to Nexworth — set your password",
    html: `
      <p>Hi ${name},</p>
      <p>An admin created a Nexworth account for you. Set a password to get started:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 48 hours.</p>
    `,
  });
}
