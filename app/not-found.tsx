import Link from "next/link";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <PhotoFallback className="w-28" />
      <h1 className="font-display text-2xl text-ink">Nothing to see here</h1>
      <p className="text-sm text-ink-soft">
        This page doesn&apos;t exist — or it was removed.
      </p>
      <Link href="/" className="text-sm font-semibold text-terracotta underline">
        Back to the mirror
      </Link>
    </main>
  );
}
