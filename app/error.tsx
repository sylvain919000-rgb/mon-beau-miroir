"use client";

import { Button } from "@/components/ui/button";

/** Route-level error boundary in brand tone. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="font-display text-2xl text-ink">That didn&apos;t work</h1>
      <p className="text-sm text-ink-soft">
        Something broke on our side. Your data is fine — try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
