import type { UserDoc } from "../models/User.js";

export type OnboardingStep = "verification" | "welcome" | "complete";

/**
 * Derived from the user's record rather than stored directly, so it can
 * never drift out of sync with the underlying dob/country/document/completion
 * fields — the client always trusts this value to know where to route.
 */
export function getOnboardingStep(
  user: Pick<UserDoc, "role" | "dob" | "country" | "docUploadUrl" | "onboardingComplete">,
): OnboardingStep {
  if (user.role === "admin") return "complete";
  if (!user.dob || !user.country || !user.docUploadUrl) return "verification";
  if (!user.onboardingComplete) return "welcome";
  return "complete";
}
