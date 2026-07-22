"use client";

import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** A labeled checkbox used for legally required consents. */
export function CheckboxField({ label, id, className, ...rest }: CheckboxFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-line",
        "bg-surface p-3 text-sm text-ink",
        "transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-surface-2",
        className
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-amber-strong)]"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}
