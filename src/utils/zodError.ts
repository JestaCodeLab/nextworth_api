import type { ZodError } from "zod";

/** Turns a Zod validation error into a single human-readable string for API error responses. */
export function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0];
  return first ? first.message : "Invalid request";
}
