import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Hero3D } from "@/components/hero-3d";
import { copy } from "@/lib/copy";

/**
 * Landing page: tagline + CTAs on the left, the 3D mirror hero on the
 * right (stacked on mobile, hero first so it hooks before the pitch),
 * then a three-step "how it works" strip.
 */
export default function HomePage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-12 sm:pt-16">
        <section className="flex flex-col-reverse items-center gap-12 sm:flex-row sm:justify-between">
          <div className="max-w-md text-center sm:text-left">
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
              {copy.tagline}
            </h1>
            <p className="mt-4 text-sm text-ink-soft">
              Upload one photo of yourself. Real people — never bots — score it
              1 to 10. Keep the detailed breakdown private, or show the world
              what they said.
            </p>
            <div className="mt-6 flex justify-center gap-3 sm:justify-start">
              <Link
                href="/signup"
                className="rounded-pill bg-amber px-6 py-3 text-sm font-semibold text-bg shadow-soft transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-amber-strong"
              >
                Create your mirror
              </Link>
              <Link
                href="/login"
                className="rounded-pill border border-line px-6 py-3 text-sm font-semibold text-ink-soft transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-surface"
              >
                Log in
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-faint">18+ only.</p>
          </div>

          <Hero3D />
        </section>

        <section className="mt-16 grid gap-3 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Upload one photo",
              text: "A single photo represents you. Pick it well — it's the whole profile.",
            },
            {
              step: "2",
              title: "Get honest ratings",
              text: "Members score you 1–10, with an optional detailed breakdown.",
            },
            {
              step: "3",
              title: "Start conversations",
              text: "Someone catch your eye? Send them a private message.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-line bg-surface p-4 text-center sm:text-left"
            >
              <span className="font-display text-xl text-terracotta">{item.step}</span>
              <h2 className="mt-1 text-sm font-bold text-ink">{item.title}</h2>
              <p className="mt-1 text-xs text-ink-soft">{item.text}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
