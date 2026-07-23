import { AppNav } from "@/components/app-nav";
import { copy } from "@/lib/copy";

export const metadata = { title: `Privacy Policy — ${copy.appName}` };

/** Plain-English privacy policy. Drafting material — lawyer review advised. */
export default function PrivacyPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10 text-sm leading-relaxed text-ink-soft [&_h2]:mt-6 [&_h2]:font-bold [&_h2]:text-ink [&_p]:mt-2">
        <h1 className="font-display text-2xl text-ink">Privacy Policy</h1>
        <p className="text-xs text-ink-faint">
          Last updated: 23 July 2026 · Contact: {copy.contactEmail}
        </p>

        <h2>1. What we store</h2>
        <p>
          Your email, your username, your photo, the gender you were born
          with and your birth month and year (asked once before you rate,
          then locked), the ratings you give and receive, your messages, your
          purchases (via Stripe), and the consents you gave with their
          timestamps. That&apos;s it — we don&apos;t collect contacts,
          location, or anything from other apps.
        </p>

        <h2>2. Who sees what</h2>
        <p>
          Members see your username, your photo (once approved), and your
          overall average. Your default avatar is colored by your stated
          gender (blue for male, rose for female), so that answer is visible
          to other members. Your per-detail breakdown is private to you by
          default and becomes visible only while you keep the sharing switch
          on. Photo owners can pay to see their received ratings split by
          the gender of their raters — always as aggregated averages, never
          linked to your name. Individual ratings are never shown with the
          rater&apos;s name. Messages are visible only to the two people in
          the conversation, and to our moderation team when a message is
          reported.
        </p>

        <h2>3. Processors we rely on</h2>
        <p>
          Supabase hosts our database and photo storage. Vercel hosts the
          application. Stripe processes payments — your card details go to
          Stripe directly and never touch our servers. Resend delivers our
          notification emails. We do not sell your data or your photo to
          anyone.
        </p>

        <h2>4. Emails we send</h2>
        <p>
          We email you when your photo enters review, when it is approved,
          and when your ratings reach small milestones. Account and payment
          emails may also come from our providers (Supabase for login links,
          Stripe for receipts). To stop the milestone emails, contact{" "}
          {copy.contactEmail}.
        </p>

        <h2>5. How long we keep things</h2>
        <p>
          As long as your account exists. Deleting your account deletes your
          profile, photo, ratings and messages. Payment records are kept as
          long as accounting law requires. Moderation decisions are kept to
          protect other members.
        </p>

        <h2>6. Your rights (GDPR)</h2>
        <p>
          You can access, correct, export, or delete your data, and object to
          processing, by emailing {copy.contactEmail}. Note that your gender
          and birth date answers are locked against self-service edits to
          keep paid statistics honest — contact us for genuine corrections.
          You can also complain to your local data-protection authority (in
          France, the CNIL).
        </p>

        <h2>7. Where data lives</h2>
        <p>
          Our infrastructure is hosted in the EU where available; where a
          processor stores data elsewhere, standard contractual clauses
          apply.
        </p>
      </main>
    </>
  );
}
