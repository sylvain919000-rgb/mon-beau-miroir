"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_REGEX } from "@/lib/constants";

export interface OnboardingState {
  error: string | null;
}

/**
 * Completes onboarding: validates the username, records both legally
 * required consents, and stamps tos_accepted_at. The middleware treats a
 * null tos_accepted_at as "onboarding unfinished", so this action is the
 * single gate into the app for every sign-up method (password, magic
 * link, Google).
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const ageOk = formData.get("age_ok") === "on";
  const tosOk = formData.get("tos_ok") === "on";

  if (!USERNAME_REGEX.test(username)) {
    return { error: "Username must be 3–24 characters: lowercase letters, numbers, underscores." };
  }
  if (!ageOk || !tosOk) {
    return { error: "Both confirmations are required to use Mon Beau Miroir." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName || null,
      is_over_18: true,
      tos_accepted_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation: the username is taken.
    if (error.code === "23505") {
      return { error: "That username is taken — try another." };
    }
    return { error: "Something went wrong saving your profile. Please try again." };
  }

  redirect("/me");
}
