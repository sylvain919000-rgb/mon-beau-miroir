import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "./send";

/** Rating counts that earn the photo owner a congratulation email. */
export const RATING_MILESTONES = [1, 3, 5, 10];

/** Where email links point. */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://mon-beau-miroir.bereytapps.com";
}

/**
 * Emails a user by their id. Addresses live in auth.users (not in
 * profiles), so the lookup needs the service-role admin API. Swallows
 * every failure — notifications are best-effort by design.
 */
export async function notifyUserByEmail(
  userId: string,
  subject: string,
  text: string
): Promise<void> {
  try {
    const service = createServiceClient();
    const { data } = await service.auth.admin.getUserById(userId);
    const email = data?.user?.email;
    if (!email) return;
    await sendEmail({ to: email, subject, text });
  } catch (error) {
    console.error("notifyUserByEmail failed", error);
  }
}
