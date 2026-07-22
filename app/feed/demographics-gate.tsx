"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDemographics } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import type { BirthSex } from "@/lib/database.types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Oldest selectable birth year; youngest is current year − 18 (the 18+ floor). */
const OLDEST_BIRTH_YEAR = 1925;

/**
 * The unskippable pre-rating gate: sex at birth + birth month/year.
 * Deliberately NOT the shared <Modal> (native <dialog> closes on Esc):
 * this is a plain fixed overlay with no close button, no backdrop
 * dismissal and no Esc handling — the only way through is answering.
 * The server re-validates everything, including the 18+ age floor.
 */
export function DemographicsGate() {
  const router = useRouter();
  const [birthSex, setBirthSex] = useState<BirthSex | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const youngestBirthYear = new Date().getFullYear() - 18;
  const years: number[] = [];
  for (let year = youngestBirthYear; year >= OLDEST_BIRTH_YEAR; year--) years.push(year);

  const complete = birthSex !== null && birthMonth !== null && birthYear !== null;

  async function handleSubmit() {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveDemographics({
      birthSex: birthSex as BirthSex,
      birthMonth: birthMonth as number,
      birthYear: birthYear as number,
    });
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.refresh(); // server re-renders /feed; the gate disappears
  }

  const selectClasses = cn(
    "w-full rounded-md border border-line bg-bg p-3 text-sm text-ink",
    "focus:border-amber"
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.demographics.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div className="w-[min(92vw,28rem)] animate-[mbm-pop_var(--mbm-dur-base)_var(--ease-mbm)] rounded-lg bg-bg p-6 shadow-modal">
        <h2 className="font-display text-xl text-ink">{copy.demographics.title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{copy.demographics.intro}</p>

        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-ink">{copy.demographics.sexLabel}</legend>
          <div className="mt-2 flex gap-2">
            {(["male", "female"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={birthSex === option}
                onClick={() => setBirthSex(option)}
                className={cn(
                  "flex-1 rounded-pill border py-2.5 text-sm font-semibold",
                  "transition-colors duration-[var(--mbm-dur-fast)] ease-mbm",
                  birthSex === option
                    ? "border-amber-strong bg-amber text-bg shadow-soft"
                    : "border-line bg-bg text-ink-soft hover:border-amber hover:bg-surface"
                )}
              >
                {option === "male" ? copy.demographics.male : copy.demographics.female}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex gap-2">
          <label className="flex-1">
            <span className="text-sm font-bold text-ink">{copy.demographics.monthLabel}</span>
            <select
              value={birthMonth ?? ""}
              onChange={(e) => setBirthMonth(e.target.value ? Number(e.target.value) : null)}
              className={cn(selectClasses, "mt-2")}
            >
              <option value="" disabled>
                Month
              </option>
              {MONTH_NAMES.map((monthName, index) => (
                <option key={monthName} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="text-sm font-bold text-ink">{copy.demographics.yearLabel}</span>
            <select
              value={birthYear ?? ""}
              onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : null)}
              className={cn(selectClasses, "mt-2")}
            >
              <option value="" disabled>
                Year
              </option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-ink-faint">{copy.demographics.lockNote}</p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <Button
          onClick={handleSubmit}
          loading={saving}
          disabled={!complete}
          className="mt-4 w-full"
        >
          {copy.demographics.submit}
        </Button>
      </div>
    </div>
  );
}
