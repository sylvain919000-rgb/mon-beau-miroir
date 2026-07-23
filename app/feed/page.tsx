import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { postedAgo } from "@/lib/relative-time";
import { DemographicsGate } from "./demographics-gate";
import { RatingFlow, type FeedCard } from "./rating-flow";

/**
 * Builds the caller's rating queue: active + approved photos they don't
 * own and haven't rated yet, newest first. RLS already filters out
 * anything they may not see; the query just narrows it down.
 * First visit: the unskippable demographics gate replaces the queue
 * until sex at birth + birth month/year are answered (submitRating
 * enforces the same requirement server-side).
 */
export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("birth_sex")
    .eq("id", user.id)
    .single();
  if (!myProfile?.birth_sex) {
    return (
      <>
        <AppNav />
        <DemographicsGate />
      </>
    );
  }

  const { data: myRatings } = await supabase
    .from("ratings")
    .select("photo_id")
    .eq("rater_id", user.id);
  const ratedPhotoIds = (myRatings ?? []).map((rating) => rating.photo_id);

  let queueQuery = supabase
    .from("photos")
    .select("id, owner_id, created_at")
    .eq("status", "active")
    .eq("moderation", "approved")
    .neq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);
  if (ratedPhotoIds.length > 0) {
    queueQuery = queueQuery.not("id", "in", `(${ratedPhotoIds.join(",")})`);
  }
  const { data: photos } = await queueQuery;

  // Owner usernames for the cards (separate query keeps types simple).
  const ownerIds = [...new Set((photos ?? []).map((photo) => photo.owner_id))];
  const { data: owners } = ownerIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, birth_sex, is_admin")
        .in("id", ownerIds)
    : { data: [] };
  const ownerById = new Map((owners ?? []).map((owner) => [owner.id, owner]));

  const cards: FeedCard[] = (photos ?? []).map((photo) => ({
    photoId: photo.id,
    username: ownerById.get(photo.owner_id)?.username ?? "member",
    sex: ownerById.get(photo.owner_id)?.birth_sex ?? null,
    isAdmin: ownerById.get(photo.owner_id)?.is_admin ?? false,
    postedLabel: postedAgo(photo.created_at),
  }));

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <RatingFlow initialCards={cards} />
      </main>
    </>
  );
}
