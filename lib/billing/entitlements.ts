import { createClient } from "@/lib/supabase/server";

/**
 * What the current user is entitled to, computed from their own
 * user_entitlements rows (readable under RLS). Mirrors the SQL helpers
 * has_send_access / has_read_access — the DB stays the enforcer; this
 * summary only drives what the UI shows.
 */
export interface EntitlementSummary {
  hasActiveSubscription: boolean;
  /** ISO end of the current subscription period, if subscribed. */
  subscriptionEndsAt: string | null;
  /** Unused single-message credits. */
  messageCredits: number;
  /** Unused gender-split reveal credits (one look each). */
  genderRevealCredits: number;
  /** ISO expiry of a currently running reading pass, else null. */
  readPassExpiresAt: string | null;
  canSend: boolean;
  canRead: boolean;
}

export async function getEntitlementSummary(userId: string): Promise<EntitlementSummary> {
  const supabase = await createClient();
  const { data: entitlements } = await supabase
    .from("user_entitlements")
    .select("type, credits_remaining, expires_at, active")
    .eq("user_id", userId)
    .eq("active", true);

  const now = Date.now();
  let hasActiveSubscription = false;
  let subscriptionEndsAt: string | null = null;
  let messageCredits = 0;
  let genderRevealCredits = 0;
  let readPassExpiresAt: string | null = null;

  for (const entitlement of entitlements ?? []) {
    const notExpired =
      entitlement.expires_at === null || Date.parse(entitlement.expires_at) > now;

    if (entitlement.type === "subscription" && notExpired) {
      hasActiveSubscription = true;
      subscriptionEndsAt = entitlement.expires_at;
    }
    if (entitlement.type === "message_credit") {
      messageCredits += entitlement.credits_remaining ?? 0;
    }
    if (entitlement.type === "gender_reveal") {
      genderRevealCredits += entitlement.credits_remaining ?? 0;
    }
    if (entitlement.type === "read_pass" && entitlement.expires_at && notExpired) {
      // Keep the latest-running pass for the countdown.
      if (!readPassExpiresAt || entitlement.expires_at > readPassExpiresAt) {
        readPassExpiresAt = entitlement.expires_at;
      }
    }
  }

  return {
    hasActiveSubscription,
    subscriptionEndsAt,
    messageCredits,
    genderRevealCredits,
    readPassExpiresAt,
    canSend: hasActiveSubscription || messageCredits > 0,
    canRead: hasActiveSubscription || readPassExpiresAt !== null,
  };
}
