import { AppNav } from "@/components/app-nav";
import { SignupForm } from "./signup-form";
import { copy } from "@/lib/copy";
import Link from "next/link";

export default function SignupPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="font-display text-2xl text-ink">Join {copy.appName}</h1>

        {/* Plain-English terms summary, always visible above the consents */}
        <section className="mt-6 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">{copy.signup.termsTitle}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
            {copy.signup.termsBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">
            {copy.signup.termsLinkNote}{" "}
            <Link href="/terms" className="underline">Terms</Link> ·{" "}
            <Link href="/privacy" className="underline">Privacy</Link>
          </p>
        </section>

        <details className="mt-3 rounded-lg border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">
            {copy.signup.privacyTitle}
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
            {copy.signup.privacyBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </details>

        <SignupForm />
      </main>
    </>
  );
}
