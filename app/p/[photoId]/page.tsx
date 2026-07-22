import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AvatarFallback } from "@/components/fallbacks/avatar-fallback";
import { SafePhoto } from "@/components/safe-photo";
import { createClient } from "@/lib/supabase/server";
import { ATTRIBUTE_LABELS } from "@/lib/constants";
import { copy } from "@/lib/copy";
import type { PhotoStats } from "@/lib/database.types";
import { MessageCta } from "@/components/message-cta";
import { ReportButton } from "@/components/report-button";

/**
 * Public photo page. Individual rating rows are private (RLS), so all
 * numbers come from the get_photo_stats RPC, which applies the owner's
 * privacy toggle at the database level:
 *   - stats.attributes === null  → breakdown is private, render NOTHING
 *     about attributes (not even a locked teaser)
 *   - stats.attributes is a list → owner made it public, show the banner
 */
export default async function PhotoPage({
  params,
}: {
  params: Promise<{ photoId: string }>;
}) {
  const { photoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: photo } = await supabase
    .from("photos")
    .select("id, owner_id")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) notFound();

  const [{ data: owner }, { data: rawStats }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, birth_sex")
      .eq("id", photo.owner_id)
      .single(),
    supabase.rpc("get_photo_stats", { p_photo: photoId }),
  ]);
  const stats = rawStats as PhotoStats | null;
  if (!owner || !stats) notFound();

  const isOwner = photo.owner_id === user.id;
  const showPublicBanner = !isOwner && stats.attributes !== null;

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AvatarFallback name={owner.username} sex={owner.birth_sex} sizeClass="size-9" />
            <div>
              <p className="text-sm font-semibold text-ink">
                {owner.display_name ?? owner.username}
              </p>
              <p className="text-xs text-ink-faint">@{owner.username}</p>
            </div>
          </div>
          {!isOwner && <MessageCta username={owner.username} variant="header" />}
        </div>

        <div className="mt-3">
          <SafePhoto photoId={photoId} alt={`Photo of ${owner.username}`} />
        </div>

        <section className="mt-5 flex items-baseline gap-3">
          <span className="font-display text-score leading-none text-terracotta">
            {stats.overall.avg_score ?? "–"}
          </span>
          <span className="text-sm text-ink-soft">
            average · {stats.overall.rating_count}{" "}
            {stats.overall.rating_count === 1 ? "rating" : "ratings"}
          </span>
        </section>

        {stats.attributes !== null && (
          <section className="mt-6">
            {showPublicBanner && (
              <div className="rounded-md border border-line bg-surface p-3">
                <p className="text-sm font-semibold text-ink">
                  🔓 {copy.attributes.publicBanner}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {copy.attributes.publicBannerSub}
                </p>
              </div>
            )}

            <ul className="mt-4 flex flex-col gap-2.5">
              {stats.attributes.map((entry) => (
                <li key={entry.attribute} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {ATTRIBUTE_LABELS[entry.attribute]}
                  </span>
                  <span
                    className="h-2 rounded-pill bg-gradient-to-r from-peach to-amber"
                    style={{ width: `${entry.avg_score * 10}%` }}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold text-ink">{entry.avg_score}</span>
                  <span className="text-xs text-ink-faint">({entry.rating_count})</span>
                </li>
              ))}
              {stats.attributes.length === 0 && (
                <li className="text-sm text-ink-faint">No attribute ratings yet.</li>
              )}
            </ul>
          </section>
        )}

        {!isOwner && (
          <div className="mt-3 text-right">
            <ReportButton kind="photo" photoId={photoId} />
          </div>
        )}
      </main>
    </>
  );
}
