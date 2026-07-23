/**
 * Human label for how long ago something was posted:
 *   under 1 hour   → "just now"
 *   under 24 hours → "x hours ago"
 *   under 7 days   → "x days ago"
 *   older          → "July 12" (year added when it isn't this year)
 *
 * Compute this on the SERVER and pass the string down: client components
 * re-running Date.now() during hydration would render a slightly
 * different label than the server did and trigger hydration warnings.
 */
export function postedAgo(isoTimestamp: string, now: Date = new Date()): string {
  const posted = new Date(isoTimestamp);
  const elapsedMs = now.getTime() - posted.getTime();

  const hours = Math.floor(elapsedMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;

  const sameYear = posted.getFullYear() === now.getFullYear();
  return posted.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
