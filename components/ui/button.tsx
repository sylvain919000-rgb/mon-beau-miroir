"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Shows a subtle busy state and disables the button. */
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-amber text-bg hover:bg-amber-strong active:scale-[0.98] shadow-soft",
  ghost:
    "bg-transparent text-ink-soft border border-line hover:bg-surface active:scale-[0.98]",
  danger:
    "bg-danger text-bg hover:opacity-90 active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5",
        "text-sm font-semibold transition-[background-color,transform,opacity]",
        "duration-[var(--mbm-dur-fast)] ease-mbm",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "One moment…" : children}
    </button>
  );
}
