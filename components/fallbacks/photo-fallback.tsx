import { cn } from "@/lib/cn";

/**
 * SVG mirror-motif placeholder shown whenever a photo is missing,
 * still loading from a failed source, or pending moderation.
 * Colors come from the design tokens via currentColor + utility classes.
 */
export function PhotoFallback({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="No photo available"
      className={cn(
        "flex aspect-[3/4] w-full items-center justify-center",
        "rounded-lg bg-surface-2 text-peach",
        className
      )}
    >
      <svg width="96" height="128" viewBox="0 0 96 128" fill="none" aria-hidden>
        {/* hand mirror: glass, frame, handle */}
        <ellipse cx="48" cy="46" rx="34" ry="40" className="fill-rose" />
        <ellipse cx="48" cy="46" rx="34" ry="40" stroke="currentColor" strokeWidth="5" />
        <path d="M48 88v28" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M36 118h24" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        {/* glint */}
        <path d="M34 30c4-8 12-13 20-14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  );
}
