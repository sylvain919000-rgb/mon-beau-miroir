import { cn } from "@/lib/cn";

/** Glassmorphism shimmer shown while real content is loading. */
export function GlassSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-md", className)}
      style={{
        background:
          "linear-gradient(100deg, var(--mbm-glass) 40%, var(--color-surface-2) 50%, var(--mbm-glass) 60%)",
        backgroundSize: "200% 100%",
        animation: "mbm-shimmer 1.4s var(--ease-mbm) infinite",
        backdropFilter: "blur(6px)",
      }}
    />
  );
}
