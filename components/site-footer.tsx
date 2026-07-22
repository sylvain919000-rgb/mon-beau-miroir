import Link from "next/link";
import { copy } from "@/lib/copy";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-ink-faint">
        <span>{copy.appName} · 18+ only</span>
        <span className="flex gap-4">
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        </span>
      </div>
    </footer>
  );
}
