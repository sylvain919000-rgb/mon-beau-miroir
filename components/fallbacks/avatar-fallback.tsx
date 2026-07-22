import { cn } from "@/lib/cn";
import type { BirthSex } from "@/lib/database.types";

interface AvatarFallbackProps {
  name: string;
  /** Diameter utility, e.g. "size-9". */
  sizeClass?: string;
  /**
   * Colors the disc: males get the blue gradient, females (and anyone
   * who hasn't answered the demographics gate) keep the warm rose one.
   */
  sex?: BirthSex | null;
  className?: string;
}

/** Initials on a gradient disc. Used wherever a user has no image. */
export function AvatarFallback({
  name,
  sizeClass = "size-9",
  sex = null,
  className,
}: AvatarFallbackProps) {
  const initials = name
    .split(/[\s_]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-pill",
        sex === "male"
          ? "bg-gradient-to-br from-info-soft to-info text-bg"
          : "bg-gradient-to-br from-rose to-peach text-ink",
        "text-xs font-bold",
        sizeClass,
        className
      )}
    >
      {initials || "?"}
    </span>
  );
}
