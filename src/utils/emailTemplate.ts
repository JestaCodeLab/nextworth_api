import { env } from "../config/env.js";

const BRAND_COLOR = "#7c3aed";
const TEXT_COLOR = "#18181b";
const MUTED_COLOR = "#71717a";
const BORDER_COLOR = "#e4e4e7";
const BACKGROUND_COLOR = "#f4f4f5";
const LOGO_URL = `${env.CLIENT_URL}/nexworth_brand_logos/nexworth-logo-blue.png`;

interface EmailTemplateOptions {
  /** Shows in the recipient's inbox preview line, hidden in the rendered email itself. */
  previewText: string;
  heading: string;
  /** Pre-built inner HTML — paragraphs, a code block, etc. Rendered as-is inside the card. */
  bodyHtml: string;
  cta?: { label: string; url: string };
}

/** A single shared chrome (logo header, white card, footer) that every outbound email renders inside, so all of them look like they came from the same product. */
export function renderEmail({ previewText, heading, bodyHtml, cta }: EmailTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BACKGROUND_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BACKGROUND_COLOR};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <img src="${LOGO_URL}" alt="Nexworth" height="28" style="height:28px;width:auto;display:block;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:16px;padding:36px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${TEXT_COLOR};font-weight:700;">${heading}</h1>
                <div style="font-size:15px;line-height:1.6;color:${TEXT_COLOR};">${bodyHtml}</div>
                ${
                  cta
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:10px;background-color:${BRAND_COLOR};">
                      <a href="${cta.url}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${cta.label}</a>
                    </td>
                  </tr>
                </table>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:24px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED_COLOR};">
                  Nexworth · This is an automated message, please don't reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A monospace, letter-spaced block for one-time codes — used by the verification-code email. */
export function emailCodeBlock(code: string): string {
  return `<div style="margin-top:20px;padding:16px;background-color:${BACKGROUND_COLOR};border-radius:10px;text-align:center;">
    <span style="font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:${TEXT_COLOR};">${code}</span>
  </div>`;
}
