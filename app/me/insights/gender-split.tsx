"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/paywall-modal";
import { cn } from "@/lib/cn";
import type { GenderSplitBucket } from "@/lib/database.types";

export type GenderSplitState =
  /** Unlocked (subscriber, or a reveal credit was just consumed): show the numbers. */
  | { kind: "data"; male: GenderSplitBucket; female: GenderSplitBucket; unknown: GenderSplitBucket }
  /** A paid reveal is waiting; consuming it is the user's explicit click. */
  | { kind: "credit_ready"; credits: number }
  /** No subscription, no credits: sell the reveal. */
  | { kind: "locked" };

/**
 * The third insights box: ratings received, split by the raters' gender.
 * Same card language as the other insight sections. The lock is real —
 * locked/credit_ready states receive NO stats data from the server, so
 * nothing sensitive hides in the page payload behind the blur.
 */
export function GenderSplit({ state }: { state: GenderSplitState }) {
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm font-bold text-ink">Who rates you higher?</h2>
      <p className="mt-0.5 text-xs text-ink-soft">
        Your received ratings, split by your raters&apos; gender.
      </p>

      {state.kind === "data" && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <BucketCard label="Men" accentClass="text-info" bucket={state.male} />
            <BucketCard label="Women" accentClass="text-terracotta" bucket={state.female} />
          </div>
          {state.unknown.rating_count > 0 && (
            <p className="mt-3 text-xs text-ink-faint">
              {state.unknown.rating_count}{" "}
              {state.unknown.rating_count === 1 ? "rating" : "ratings"} from members who
              haven&apos;t shared their gender yet
              {state.unknown.avg_score !== null && ` (avg ${state.unknown.avg_score})`}.
            </p>
          )}
        </div>
      )}

      {state.kind === "credit_ready" && (
        <div className="mt-4 flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-ink-soft">
            You have {state.credits === 1 ? "a reveal" : `${state.credits} reveals`} ready.
            Using one shows the split for this one look.
          </p>
          <Link
            href="/me/insights?reveal=1"
            className="rounded-pill bg-amber px-6 py-2.5 text-sm font-semibold text-bg shadow-soft transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-amber-strong"
          >
            Use a reveal now
          </Link>
        </div>
      )}

      {state.kind === "locked" && (
        <div className="mt-4">
          {/* Decorative teaser only — real numbers never reach the client while locked. */}
          <div aria-hidden className="select-none blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <BucketCard label="Men" accentClass="text-info" bucket={{ avg_score: 8.4, rating_count: 12 }} />
              <BucketCard label="Women" accentClass="text-terracotta" bucket={{ avg_score: 9.2, rating_count: 15 }} />
            </div>
          </div>
          <Button onClick={() => setPaywallOpen(true)} className="mt-4 w-full">
            Unlock the split
          </Button>
        </div>
      )}

      <PaywallModal
        variant="gender"
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        returnTo="/me/insights"
      />
    </section>
  );
}

function BucketCard({
  label,
  accentClass,
  bucket,
}: {
  label: string;
  accentClass: string;
  bucket: GenderSplitBucket;
}) {
  return (
    <div className="rounded-md border border-line bg-bg p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn("mt-1 font-display text-score leading-none", accentClass)}>
        {bucket.avg_score ?? "–"}
      </p>
      <p className="mt-1 text-xs text-ink-faint">
        {bucket.rating_count} {bucket.rating_count === 1 ? "rating" : "ratings"}
      </p>
    </div>
  );
}
