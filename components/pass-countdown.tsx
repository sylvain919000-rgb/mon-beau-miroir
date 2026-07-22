"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Inbox open · 12:34 left" pill. Ticks every second; when the pass
 * expires it refreshes the page so the server re-renders teasers —
 * the database has already stopped returning message bodies by then.
 */
export function PassCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const left = remaining(expiresAt);
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, router]);

  if (secondsLeft <= 0) return null;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-1 text-xs font-semibold text-terracotta">
      Inbox open · {minutes}:{seconds} left
    </span>
  );
}

function remaining(expiresAt: string): number {
  return Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
}
