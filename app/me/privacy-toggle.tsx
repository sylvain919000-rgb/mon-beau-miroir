"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { setAttributeVisibility } from "./actions";
import { copy } from "@/lib/copy";

interface PrivacyToggleProps {
  photoId: string;
  initialPublic: boolean;
}

/**
 * Optimistic switch: flips instantly, saves in the background,
 * and rolls back with a message if the save fails.
 */
export function PrivacyToggle({ photoId, initialPublic }: PrivacyToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  function toggle() {
    const next = !isPublic;
    setIsPublic(next); // optimistic
    setError(null);
    startSaving(async () => {
      const result = await setAttributeVisibility(photoId, next);
      if (result.error) {
        setIsPublic(!next); // roll back
        setError(result.error);
      }
    });
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-ink">{copy.attributes.toggleLabel}</span>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label={copy.attributes.toggleLabel}
          onClick={toggle}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-[var(--mbm-dur-fast)] ease-mbm",
            isPublic ? "bg-amber" : "bg-line"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-pill bg-bg shadow-soft",
              "transition-[left] duration-[var(--mbm-dur-fast)] ease-mbm",
              isPublic ? "left-[calc(100%-1.375rem)]" : "left-0.5"
            )}
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {isPublic ? copy.attributes.toggleOnHelp : copy.attributes.toggleOffHelp}
      </p>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
