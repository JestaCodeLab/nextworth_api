import { env } from "./env.js";

// Per the FlockText developer docs screenshot shared for this integration.
// Every response uses this envelope: status is "success" or "error", data is
// populated on success and usually null on error.
export const FLOCKTEXT_BASE_URL = "https://api.flocktext.com/api/v1";

export interface FlockTextEnvelope<T> {
  status: "success" | "error";
  message: string;
  data: T | null;
}

export function isFlockTextConfigured() {
  return Boolean(env.FLOCKTEXT_API_KEY && env.FLOCKTEXT_SENDER_ID);
}

export async function flockTextFetch<T>(path: string, init?: RequestInit): Promise<FlockTextEnvelope<T>> {
  const res = await fetch(`${FLOCKTEXT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.FLOCKTEXT_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json()) as FlockTextEnvelope<T>;
  if (!res.ok || body.status !== "success") {
    throw new Error(body.message || `FlockText request failed (${res.status})`);
  }
  return body;
}
