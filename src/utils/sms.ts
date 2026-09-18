import { env } from "../config/env.js";
import { flockTextFetch, isFlockTextConfigured } from "../config/flocktext.js";
import { MARKET_CALLING_CODES } from "./phone.js";

interface SendSmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * FlockText only covers Ghana, so SMS is only sent to Ghana numbers —
 * enforced here, the one chokepoint every call site already routes through,
 * rather than at each caller (safer against a future call site forgetting
 * the rule). Numbers are expected already normalized to a market's calling
 * code (see resolvePhoneForMarket), so this is just a prefix check against
 * Ghana's (+233). When a UK-capable provider is added, branch on market
 * here rather than reject non-GH numbers outright.
 */
function isGhanaianPhone(phone: string): boolean {
  return phone.trim().replace(/[\s\-()]/g, "").startsWith(MARKET_CALLING_CODES.GH);
}

interface FlockTextSendResponse {
  id: string;
  stats: { total: number; delivered: number; failed: number; pending: number };
  creditCost: number;
  creditsBalance: number;
}

/**
 * Sends via FlockText's "Send a message immediately" endpoint
 * (POST /messages/send — recipients: [{ phone, name? }], message).
 * Confirmed against FlockText's own docs (not sender_id — that's implied by
 * the account tied to the API key). A 201 here means the message was
 * accepted/queued, not that it was delivered — FlockText reports delivery
 * asynchronously (stats.pending) and this app has no webhook/polling for
 * that yet, so "sent" means "accepted by the provider".
 */
export async function sendSms(to: string, message: string, name?: string): Promise<SendSmsResult> {
  if (!isGhanaianPhone(to)) {
    return { success: false, error: "SMS is only sent to Ghana numbers" };
  }
  if (!isFlockTextConfigured()) {
    return { success: false, error: "SMS provider not configured yet" };
  }

  try {
    const { data } = await flockTextFetch<FlockTextSendResponse>("/messages/send", {
      method: "POST",
      body: JSON.stringify({
        recipients: [name ? { phone: to, name } : { phone: to }],
        message,
      }),
    });
    return { success: true, providerMessageId: data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

interface FlockTextStatusResponse {
  id: string;
  status: string;
}

/** GET /messages/:id/status — per-message delivery status, if you need to poll rather than rely on the sent-time result. */
export async function getMessageStatus(providerMessageId: string): Promise<{ status?: string; error?: string }> {
  if (!isFlockTextConfigured()) {
    return { error: "SMS provider not configured yet" };
  }

  try {
    const { data } = await flockTextFetch<FlockTextStatusResponse>(`/messages/${providerMessageId}/status`);
    return { status: data?.status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't fetch message status" };
  }
}
