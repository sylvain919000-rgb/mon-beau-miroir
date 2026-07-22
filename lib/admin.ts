import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Verifies the caller is a signed-in admin (profiles.is_admin, which
 * users cannot set on themselves — column grants, migration 0004), then
 * hands back a service-role client for moderation work. Everything the
 * service client does in admin code MUST leave a moderation_audit row.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  return { adminId: user.id, service: createServiceClient() };
}
