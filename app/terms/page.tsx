import { AppNav } from "@/components/app-nav";
import { copy } from "@/lib/copy";

export const metadata = { title: `Terms of Service — ${copy.appName}` };

/**
 * Plain-English Terms. Content lives here (it is a document, not reusable
 * microcopy); interactive legal strings stay in lib/copy.ts.
 * NOTE: drafting material — have a lawyer review before launch.
 */
export default function TermsPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10 text-sm leading-relaxed text-ink-soft [&_h2]:mt-6 [&_h2]:font-bold [&_h2]:text-ink [&_p]:mt-2">
        <h1 className="font-display text-2xl text-ink">Terms of Service</h1>
        <p className="text-xs text-ink-faint">Last updated: 22 July 2026 · Contact: legal@monbeaumiroir.com</p>

        <h2>1. What Mon Beau Miroir is</h2>
        <p>
          Mon Beau Miroir lets you upload one photo of yourself and receive
          1–10 ratings from other members, with optional per-attribute scores
          that stay private to you unless you choose to share them. Honest
          opinions can sting. Only use the service if you are comfortable
          receiving them.
        </p>

        <h2>2. Who can join</h2>
        <p>
          You must be at least 18 years old. We remove accounts and photos
          belonging to minors as soon as we become aware of them, and we may
          ask for proof of age.
        </p>

        <h2>3. Your photo</h2>
        <p>
          Your photo must be a real, recent photo of you. Not someone else,
          not AI-generated, not a public figure. No nudity, no minors anywhere
          in the frame, no offensive content. You keep ownership of your
          photo; by uploading it you give us permission to store it and show
          it to members so they can rate it. Every photo is reviewed before it
          becomes visible, and you can replace or remove it at any time.
        </p>

        <h2>4. Behaviour</h2>
        <p>
          Be kind. Harassment, hate, threats, sexual messages, spam, or
          attempts to identify or contact members outside the app against
          their will lead to removal. Ratings are opinions; using the service
          to bully someone is not tolerated.
        </p>

        <h2>5. Paid features</h2>
        <p>
          Sending messages and reading received messages are paid: single
          passes, a time-limited inbox pass, or a subscription. Every price is
          shown before you pay, taxes included, and there are no free trials.
          Because these are digital services delivered immediately, you will
          be asked to waive your 14-day EU withdrawal right at purchase.
          Subscriptions can be cancelled anytime in the billing portal and
          remain active until the end of the paid period. Payments are
          processed by Stripe; we never see your card number.
        </p>

        <h2>6. Our role and limits</h2>
        <p>
          We provide the platform, not the opinions. We may remove content or
          accounts that break these terms, and we may change or discontinue
          features with reasonable notice. The service is provided as-is to
          the extent the law allows.
        </p>

        <h2>7. Leaving</h2>
        <p>
          Delete your account whenever you want; your photo and ratings go
          with it. We can terminate accounts that break these terms.
        </p>
      </main>
    </>
  );
}
