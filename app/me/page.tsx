import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PhotoManager } from "./photo-manager";
import { PrivacyToggle } from "./privacy-toggle";
import Link from "next/link";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: photo }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("photos")
      .select("id, moderation, attributes_public, created_at")
      .eq("owner_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!profile) redirect("/onboarding");

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="font-display text-2xl text-ink">
          {profile.display_name ?? profile.username}
        </h1>
        <p className="text-sm text-ink-faint">@{profile.username}</p>

        <PhotoManager
          userId={user.id}
          photo={photo ? { id: photo.id, moderation: photo.moderation } : null}
        />

        {photo && (
          <PrivacyToggle photoId={photo.id} initialPublic={photo.attributes_public} />
        )}

        {photo && (
          <Link
            href="/me/insights"
            className="mt-4 block text-sm font-semibold text-terracotta underline"
          >
            View your insights →
          </Link>
        )}

        <Link
          href="/me/history"
          className="mt-2 block text-sm font-semibold text-terracotta underline"
        >
          Your rating history →
        </Link>
      </main>
    </>
  );
}
