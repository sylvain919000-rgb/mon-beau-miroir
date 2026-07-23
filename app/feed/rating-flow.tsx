"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { submitRating } from "./actions";
import { ScoreSelector } from "@/components/score-selector";
import { HighScoreGate } from "@/components/high-score-gate";
import { MessageCta } from "@/components/message-cta";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";
import { RadarRating } from "@/components/radar-rating";
import { SafePhoto } from "@/components/safe-photo";
import { AvatarFallback } from "@/components/fallbacks/avatar-fallback";
import { ATTRIBUTES, ATTRIBUTE_LABELS, HIGH_SCORE_THRESHOLD, type AttributeKind } from "@/lib/constants";
import type { BirthSex } from "@/lib/database.types";

export interface FeedCard {
  photoId: string;
  username: string;
  /** Colors the avatar disc (blue for males); null until they've answered the gate. */
  sex: BirthSex | null;
  /** Staff marker: green avatar disc. */
  isAdmin: boolean;
  /** Server-computed "3 hours ago" / "July 12" label for the photo's age. */
  postedLabel: string;
}

/** A tapped 9/10 waiting for confirmation: where it goes + the value. */
interface PendingHighScore {
  target: "overall" | AttributeKind;
  score: number;
}

/**
 * The addictive loop: rate → card animates away → next card slides in.
 * Optimistic: we advance immediately and reconcile in the background;
 * a failed submit re-queues the card and shows why.
 */
export function RatingFlow({ initialCards }: { initialCards: FeedCard[] }) {
  const [queue, setQueue] = useState<FeedCard[]>(initialCards);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [attributeScores, setAttributeScores] = useState<Partial<Record<AttributeKind, number>>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [useButtons, setUseButtons] = useState(false);
  const [pendingHighScore, setPendingHighScore] = useState<PendingHighScore | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const card = queue[0] ?? null;

  /** Applies a confirmed (or sub-9) score to its target. */
  function applyScore(target: PendingHighScore["target"], score: number) {
    if (target === "overall") {
      setOverallScore(score);
    } else {
      setAttributeScores((current) => ({ ...current, [target]: score }));
    }
  }

  /** Every selector tap funnels through here so the 9/10 rule is universal. */
  function handleSelect(target: PendingHighScore["target"], score: number) {
    if (score >= HIGH_SCORE_THRESHOLD) {
      setPendingHighScore({ target, score }); // gate first, apply on confirm
    } else {
      applyScore(target, score);
    }
  }

  /** Unsets one attribute (radar: spoke dragged into the center). */
  function clearAttribute(attribute: AttributeKind) {
    setAttributeScores((current) => {
      const next = { ...current };
      delete next[attribute];
      return next;
    });
  }

  function resetCardState() {
    setOverallScore(null);
    setAttributeScores({});
    setDetailsOpen(false);
    setPendingHighScore(null);
  }

  /** Pass without rating: the card moves to the back of the queue. */
  function handleSkip() {
    if (leaving) return;
    if (queue.length <= 1) {
      setNotice("That's the only profile in your queue right now.");
      return;
    }
    setNotice(null);
    setLeaving(true);
    setTimeout(() => {
      setQueue((current) => [...current.slice(1), current[0]]);
      resetCardState();
      setLeaving(false);
    }, 220);
  }

  async function handleSubmit() {
    if (!card || overallScore === null) return;
    const submitted = { card, score: overallScore, attributes: attributeScores };

    // Optimistic: move on immediately, reconcile in the background.
    setLeaving(true);
    setTimeout(() => {
      setQueue((current) => current.slice(1));
      resetCardState();
      setLeaving(false);
    }, 220);

    const result = await submitRating({
      photoId: submitted.card.photoId,
      score: submitted.score,
      attributes: submitted.attributes,
    });
    if (result.error) {
      setNotice(result.error);
      if (!result.error.includes("already")) {
        setQueue((current) => [...current, submitted.card]); // give it another chance
      }
    }
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <PhotoFallback className="w-32" />
        <h1 className="font-display text-xl text-ink">All caught up</h1>
        <p className="text-sm text-ink-soft">
          You&apos;ve rated everyone in your queue. New photos land here as members join.
        </p>
        <Link href="/me/history" className="text-sm font-semibold text-terracotta underline">
          Review who you&apos;ve rated
        </Link>
        <Link href="/me" className="text-sm font-semibold text-terracotta underline">
          Back to your mirror
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-[var(--mbm-dur-base)] ease-mbm",
        leaving && "translate-x-6 opacity-0"
      )}
    >
      {notice && (
        <p role="status" className="mb-3 rounded-md bg-surface-2 p-3 text-sm text-terracotta">
          {notice}
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AvatarFallback
            name={card.username}
            sex={card.sex}
            isAdmin={card.isAdmin}
            sizeClass="size-8"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">@{card.username}</span>
            <span className="block text-xs text-ink-faint">{card.postedLabel}</span>
          </span>
        </div>
        <MessageCta username={card.username} variant="header" />
      </div>

      <div className="mt-3">
        <SafePhoto photoId={card.photoId} alt="Photo to rate" />
      </div>

      <section className="mt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink">Your score</h2>
          {overallScore !== null && (
            <span className="font-display text-score leading-none text-terracotta">
              {overallScore}
            </span>
          )}
        </div>
        <div className="mt-2">
          <ScoreSelector
            value={overallScore}
            onSelect={(score) => handleSelect("overall", score)}
            ariaLabel="Overall score from 1 to 10"
          />
        </div>
      </section>

      <section className="mt-5">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="text-sm font-semibold text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? "Hide details" : "Rate details (optional)"}
        </button>
        {detailsOpen && (
          <div className="mt-3">
            {useButtons ? (
              <ul className="flex flex-col gap-3">
                {ATTRIBUTES.map((attribute) => (
                  <li key={attribute} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {ATTRIBUTE_LABELS[attribute]}
                    </span>
                    <ScoreSelector
                      compact
                      value={attributeScores[attribute] ?? null}
                      onSelect={(score) => handleSelect(attribute, score)}
                      ariaLabel={`${ATTRIBUTE_LABELS[attribute]} score`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <RadarRating
                values={attributeScores}
                onSelect={handleSelect}
                onClear={clearAttribute}
              />
            )}
            <button
              type="button"
              onClick={() => setUseButtons((current) => !current)}
              className="mt-3 text-xs font-semibold text-ink-faint underline decoration-line underline-offset-4 hover:text-ink"
            >
              {useButtons ? "Back to the radar" : "Prefer number buttons?"}
            </button>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={overallScore === null}
        className={cn(
          "mt-6 w-full rounded-pill py-3 text-sm font-semibold shadow-soft",
          "transition-[background-color,transform] duration-[var(--mbm-dur-fast)] ease-mbm active:scale-[0.98]",
          overallScore === null
            ? "cursor-not-allowed bg-surface-2 text-ink-faint"
            : "bg-amber text-bg hover:bg-amber-strong"
        )}
      >
        {overallScore === null ? "Pick a score first" : "Send rating"}
      </button>

      <button
        type="button"
        onClick={handleSkip}
        className="mt-3 w-full text-center text-sm font-semibold text-ink-faint underline decoration-line underline-offset-4 transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:text-ink"
      >
        Skip this profile →
      </button>

      <HighScoreGate
        pendingScore={pendingHighScore?.score ?? null}
        onConfirm={() => {
          if (pendingHighScore) applyScore(pendingHighScore.target, pendingHighScore.score);
          setPendingHighScore(null);
        }}
        onCancel={() => setPendingHighScore(null)}
      />
    </div>
  );
}

