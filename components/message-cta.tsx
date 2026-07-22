"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

interface MessageCtaProps {
  username: string;
  /**
   * "primary"   — full-width amber pill (standalone placements).
   * "secondary" — full-width quiet outlined pill.
   * "header"    — compact amber pill that sits next to the profile's
   *               name, with the "Send a private message!" nudge under it.
   */
  variant?: "primary" | "secondary" | "header";
  className?: string;
}

/**
 * Entry point into the 1-on-1 thread — and therefore into monetization:
 * the thread's composer opens the paywall when the sender has no
 * entitlement. Every placement goes through this one component so the
 * doors into messaging can never drift apart in style or destination.
 */
export function MessageCta({ username, variant = "primary", className }: MessageCtaProps) {
  if (variant === "header") {
    return (
      <div className={cn("flex shrink-0 flex-col items-end gap-1", className)}>
        <Link
          href={`/inbox/${username}`}
          className={cn(
            "rounded-pill bg-amber px-4 py-1.5 text-xs font-semibold text-bg shadow-soft",
            "transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-amber-strong"
          )}
        >
          Message @{username}
        </Link>
        <span className="text-xs text-ink-faint">Send a private message!</span>
      </div>
    );
  }

  return (
    <Link
      href={`/inbox/${username}`}
      className={cn(
        "block w-full rounded-pill py-3 text-center text-sm font-semibold",
        "transition-colors duration-[var(--mbm-dur-fast)] ease-mbm",
        variant === "primary"
          ? "bg-amber text-bg shadow-soft hover:bg-amber-strong"
          : "border border-line bg-surface text-ink hover:bg-surface-2",
        className
      )}
    >
      Message @{username}
    </Link>
  );
}
