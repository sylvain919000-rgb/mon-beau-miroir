import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AvatarFallback } from "@/components/fallbacks/avatar-fallback";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";
import { SafePhoto } from "@/components/safe-photo";
import { createClient } from "@/lib/supabase/server";

/** Newest-first cap; beyond this, add real pagination. */
const HISTORY_LIMIT = 100;

/**
 * Rating history: every profile the caller has rated, newest first.
 * Built only from data the rater already owns under RLS:
 *   - their own rows in `ratings` (score, when, which photo)
 *   - `photos` re-queried through RLS, so anything since removed or
 *     rejected simply comes back missing → rendered as "no longer
 *     available" instead of leaking a hidden photo.
 */
export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ratings } = await supabase
    .from("ratings")
    .select("photo_id, score, created_at")
    .eq("rater_id", user.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const ratedPhotoIds = (ratings ?? []).map((rating) => rating.photo_id);
  const { data: visiblePhotos } = ratedPhotoIds.length
    ? await supabase.from("photos").select("id, owner_id").in("id", ratedPhotoIds)
    : { data: [] };
  const ownerIdByPhotoId = new Map(
    (visiblePhotos ?? []).map((photo) => [photo.id, photo.owner_id])
  );

  const ownerIds = [...new Set((visiblePhotos ?? []).map((photo) => photo.owner_id))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id, username, birth_sex, is_admin").in("id", ownerIds)
    : { data: [] };
  const ownerByOwnerId = new Map((owners ?? []).map((owner) => [owner.id, owner]));

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-display text-2xl text-ink">Rating history</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone you&apos;ve rated, newest first. Tap a profile to revisit it
          or send a message.
        </p>

        {(ratings ?? []).length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <PhotoFallback className="w-32" />
            <p className="text-sm text-ink-soft">You haven&apos;t rated anyone yet.</p>
            <Link href="/feed" className="text-sm font-semibold text-terracotta underline">
              Start rating →
            </Link>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {(ratings ?? []).map((rating) => {
              const ownerId = ownerIdByPhotoId.get(rating.photo_id);
              const owner = ownerId ? ownerByOwnerId.get(ownerId) : undefined;
              const username = owner?.username;
              const ratedOn = new Date(rating.created_at).toLocaleDateString();

              // Photo gone (removed, rejected, or account deleted): keep the
              // row so the history stays complete, but there is nowhere to go.
              if (!username) {
                return (
                  <li
                    key={rating.photo_id}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3"
                  >
                    <PhotoFallback className="w-12 shrink-0" />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink-faint">
                        Profile no longer available
                      </span>
                      <span className="block text-xs text-ink-faint">rated {ratedOn}</span>
                    </span>
                    <span className="font-display text-xl leading-none text-ink-faint">
                      {rating.score}
                    </span>
                  </li>
                );
              }

              return (
                <li key={rating.photo_id}>
                  <Link
                    href={`/p/${rating.photo_id}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-surface-2"
                  >
                    <SafePhoto
                      photoId={rating.photo_id}
                      alt={`Photo of ${username}`}
                      className="w-12 shrink-0"
                    />
                    <span className="flex flex-1 items-center gap-2">
                      <AvatarFallback
                        name={username}
                        sex={owner?.birth_sex ?? null}
                        isAdmin={owner?.is_admin ?? false}
                        sizeClass="size-7"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">@{username}</span>
                        <span className="block text-xs text-ink-faint">rated {ratedOn}</span>
                      </span>
                    </span>
                    <span
                      className="font-display text-xl leading-none text-terracotta"
                      aria-label={`Your score: ${rating.score}`}
                    >
                      {rating.score}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
