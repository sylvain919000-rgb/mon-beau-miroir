"use client";

import { cn } from "@/lib/cn";
import { OFFERED_SCORES } from "@/lib/constants";

interface ScoreSelectorProps {
  value: number | null;
  /**
   * Called for every tap, including 9 and 10. The PARENT decides whether
   * to accept the score immediately or interpose the <HighScoreGate>.
   */
  onSelect: (score: number) => void;
  /** Compact renders smaller buttons for the attribute rows. */
  compact?: boolean;
  ariaLabel: string;
}

// 3-10 without 7 (see OFFERED_SCORES): no cruelty scores, no fence-sitting.
// The database still accepts 1-10, so historical ratings stay valid.
const SCORES = [...OFFERED_SCORES];

/** The tactile 1-10 control used for the overall score and every attribute. */
export function ScoreSelector({ value, onSelect, compact = false, ariaLabel }: ScoreSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap", compact ? "gap-1" : "gap-1.5")}
    >
      {SCORES.map((score) => {
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(score)}
            className={cn(
              "flex items-center justify-center rounded-md border font-semibold",
              "transition-[background-color,border-color,transform] duration-[var(--mbm-dur-fast)] ease-mbm",
              "active:scale-90",
              compact ? "size-8 text-xs" : "size-10 text-sm sm:size-11",
              selected
                ? "border-amber-strong bg-amber text-bg shadow-soft"
                : "border-line bg-bg text-ink-soft hover:border-amber hover:bg-surface"
            )}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}
