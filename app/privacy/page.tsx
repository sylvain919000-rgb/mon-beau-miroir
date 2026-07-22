import { AppNav } from "@/components/app-nav";
import { copy } from "@/lib/copy";

export const metadata = { title: `Privacy Policy — ${copy.appName}` };

/** Plain-English privacy policy. Drafting material — lawyer review before launch. */
export default function PrivacyPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10 text-sm leading-relaxed text-ink-soft [&_h2]:mt-6 [&_h2]:font-bold [&_h2]:text-ink [&_p]:mt-2">
        <h1 className="font-display text-2xl text-ink">Privacy Policy</h1>
        <p className="text-xs text-ink-faint">Last updated: 22 July 2026 · Contact: privacy@monbeaumiroir.com</p>

        <h2>1. What we store</h2>
        <p>
          Your email, your username, your photo, the ratings you give and
          receive, your messages, your purchases (via Stripe), and the
          consents you gave with their timestamps. That&apos;s it — we
          don&apos;t collect contacts, location, or anything from other apps.
        </p>

        <h2>2. Who sees what</h2>
        <p>
          Members see your username, your photo (once approved), and your
          overall average. Your per-attribute breakdown is private to you by
          default and becomes visible only while you keep the sharing switch
          on. Individual ratings are never shown with the rater&apos;s name.
          Messages are visible only to the two people in the conversation.
        </p>

        <h2>3. Processors we rely on</h2>
        <p>
          Supabase hosts our database and photo storage. Stripe processes
          payments — your card details go to Stripe directly and never touch
          our servers. We do not sell your data or your photo to anyone.
        </p>

        <h2>4. How long we keep things</h2>
        <p>
          As long as your account exists. Deleting your account deletes your
          profile, photo, ratings and messages. Payment records are kept as
          long as accounting law requires. Moderation decisions are kept to
          protect other members.
        </p>

        <h2>5. Your rights (GDPR)</h2>
        <p>
          You can access, correct, export, or delete your data, and object to
          processing, by emailing privacy@monbeaumiroir.com. You can also
          complain to your local data-protection authority (in France, the
          CNIL).
        </p>

        <h2>6. Where data lives</h2>
        <p>
          Our infrastructure is hosted in the EU where available; where a
          processor stores data elsewhere, standard contractual clauses
          apply.
        </p>
      </main>
    </>
  );
}
