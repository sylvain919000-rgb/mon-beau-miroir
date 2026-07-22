"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { setAttributeVisibility } from "@/app/me/actions";
import { copy } from "@/lib/copy";
import { ATTRIBUTE_LABELS } from "@/lib/constants";
import type { AttributePoint } from "./insights-charts";

interface VisibilityPanelProps {
  photoId: string;
  initialPublic: boolean;
  /** The owner's attribute data, reused to PREVIEW the public view.
   *  Nothing extra is fetched: what strangers would see is exactly this
   *  list, shown or hidden by the same flag the database enforces. */
  attributes: AttributePoint[];
}

export function VisibilityPanel({ photoId, initialPublic, attributes }: VisibilityPanelProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  function toggle() {
    const next = !isPublic;
    setIsPublic(next); // optimistic — preview updates in the same frame
    setError(null);
    startSaving(async () => {
      const result = await setAttributeVisibility(photoId, next);
      if (result.error) {
        setIsPublic(!next); // roll back
        setError(result.error);
      }
    });
  }

  const ratedAttributes = attributes.filter((entry) => entry.avgScore !== null);

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
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

      {/* ---- Live preview of the public photo page ---- */}
      <div className="mt-4 rounded-md border border-line bg-bg p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          What others see
        </p>

        {isPublic ? (
          <div className="mt-2">
            <div className="rounded-md border border-line bg-surface p-2.5">
              <p className="text-xs font-semibold text-ink">
                🔓 {copy.attributes.publicBanner}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{copy.attributes.publicBannerSub}</p>
            </div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {ratedAttributes.map((entry) => (
                <li key={entry.attribute} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-ink-faint">
                    {ATTRIBUTE_LABELS[entry.attribute]}
                  </span>
                  <span
                    className="h-1.5 rounded-pill bg-gradient-to-r from-peach to-amber"
                    style={{ width: `${(entry.avgScore ?? 0) * 8}%` }}
                    aria-hidden
                  />
                  <span className="text-xs font-semibold text-ink">{entry.avgScore}</span>
                </li>
              ))}
              {ratedAttributes.length === 0 && (
                <li className="text-xs text-ink-faint">No attribute ratings yet.</li>
              )}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink-soft">
            Your photo and overall average only — no attribute section at all.
          </p>
        )}
      </div>
    </section>
  );
}
