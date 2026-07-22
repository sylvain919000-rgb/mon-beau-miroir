import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import { ATTRIBUTES } from "@/lib/constants";
import type { PhotoStats } from "@/lib/database.types";
import { InsightsCharts, type DistributionPoint, type TrendPoint, type AttributePoint } from "./insights-charts";
import { VisibilityPanel } from "./visibility-panel";
import { GenderSplit, type GenderSplitState } from "./gender-split";
import { getEntitlementSummary } from "@/lib/billing/entitlements";

/**
 * The owner's analytics dashboard. As the photo owner, RLS grants read
 * access to every rating on the photo, so all aggregation happens here
 * on the server from plain queries — nothing is exposed that a stranger
 * could also compute.
 *
 * The gender split is the one PAID section: subscribers always see it;
 * a $-priced reveal credit is consumed only when the user explicitly
 * arrives with ?reveal=1 (never as a side effect of opening the page).
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ reveal?: string }>;
}) {
  const { reveal } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: photo } = await supabase
    .from("photos")
    .select("id, moderation, attributes_public")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  // ---- Empty state: no photo yet ----
  if (!photo) {
    return (
      <InsightsShell>
        <EmptyCard
          title="No photo, no numbers"
          body="Upload your photo and your first ratings will start landing here."
          cta={{ href: "/me", label: "Upload your photo" }}
        />
      </InsightsShell>
    );
  }

  // ---- Empty state: pending moderation ----
  if (photo.moderation !== "approved") {
    return (
      <InsightsShell>
        <EmptyCard title="Almost live" body={copy.moderation.pending} />
      </InsightsShell>
    );
  }

  const [{ data: ratings }, { data: rawStats }] = await Promise.all([
    supabase
      .from("ratings")
      .select("score, created_at")
      .eq("photo_id", photo.id),
    supabase.rpc("get_photo_stats", { p_photo: photo.id }),
  ]);
  const stats = rawStats as PhotoStats | null;

  // ---- Empty state: zero ratings ----
  if (!ratings || ratings.length === 0 || !stats) {
    return (
      <InsightsShell>
        <EmptyCard
          title="Your first ratings will land soon"
          body="Your photo is live. As members rate it, averages, trends and your attribute breakdown appear here."
          cta={{ href: "/feed", label: "Rate others meanwhile" }}
        />
        <VisibilityPanel
          photoId={photo.id}
          initialPublic={photo.attributes_public}
          attributes={[]}
        />
      </InsightsShell>
    );
  }

  // ---- Aggregations (owner-only data, computed server-side) ----
  const distribution: DistributionPoint[] = Array.from({ length: 10 }, (_, index) => ({
    score: index + 1,
    count: ratings.filter((rating) => rating.score === index + 1).length,
  }));

  const trend: TrendPoint[] = buildDailyTrend(ratings, 30);

  // All 13 attributes, in canonical order; unrated ones stay at null.
  const ratedByAttribute = new Map(
    (stats.attributes ?? []).map((entry) => [entry.attribute, entry])
  );
  const attributes: AttributePoint[] = ATTRIBUTES.map((attribute) => {
    const entry = ratedByAttribute.get(attribute);
    return {
      attribute,
      avgScore: entry?.avg_score ?? null,
      ratingCount: entry?.rating_count ?? 0,
    };
  });

  const average =
    Math.round((ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length) * 10) / 10;

  // ---- Gender split: decide whether the caller may see it right now ----
  const entitlements = await getEntitlementSummary(user.id);
  let genderSplitState: GenderSplitState = { kind: "locked" };
  if (entitlements.hasActiveSubscription || (entitlements.genderRevealCredits > 0 && reveal === "1")) {
    const { data: split } = await supabase.rpc("reveal_gender_split");
    if (split && split.status === "ok") {
      genderSplitState = {
        kind: "data",
        male: split.male,
        female: split.female,
        unknown: split.unknown,
      };
    }
  } else if (entitlements.genderRevealCredits > 0) {
    genderSplitState = { kind: "credit_ready", credits: entitlements.genderRevealCredits };
  }

  return (
    <InsightsShell>
      <InsightsCharts
        average={average}
        ratingCount={ratings.length}
        distribution={distribution}
        trend={trend}
        attributes={attributes}
      />
      <GenderSplit state={genderSplitState} />
      <VisibilityPanel
        photoId={photo.id}
        initialPublic={photo.attributes_public}
        attributes={attributes}
      />
    </InsightsShell>
  );
}

function InsightsShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-display text-2xl text-ink">Your insights</h1>
        <div className="mt-5 flex flex-col gap-5">{children}</div>
      </main>
    </>
  );
}

function EmptyCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-6 text-center">
      <PhotoFallback className="w-28" />
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <p className="text-sm text-ink-soft">{body}</p>
      {cta && (
        <Link href={cta.href} className="text-sm font-semibold text-terracotta underline">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

/** Ratings-per-day for the last N days, zero-filled so the line is continuous. */
function buildDailyTrend(
  ratings: { created_at: string }[],
  days: number
): TrendPoint[] {
  const countsByDay = new Map<string, number>();
  for (const rating of ratings) {
    const day = rating.created_at.slice(0, 10); // YYYY-MM-DD
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }
  const points: TrendPoint[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const day = date.toISOString().slice(0, 10);
    points.push({ day: day.slice(5), count: countsByDay.get(day) ?? 0 }); // MM-DD label
  }
  return points;
}
