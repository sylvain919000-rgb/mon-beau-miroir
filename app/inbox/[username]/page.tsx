import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AvatarFallback } from "@/components/fallbacks/avatar-fallback";
import { PassCountdown } from "@/components/pass-countdown";
import { ThreadComposer } from "./thread-composer";
import { createClient } from "@/lib/supabase/server";
import { getEntitlementSummary } from "@/lib/billing/entitlements";
import { cn } from "@/lib/cn";
import { ReportButton } from "@/components/report-button";

/**
 * A 1-on-1 thread. RLS decides what the query returns:
 *   - messages I sent: always visible
 *   - messages I received: only while I have read access
 * So an expired pass simply makes received bodies vanish from the
 * result set — no special-case code, the page just renders less.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: counterpart } = await supabase
    .from("profiles")
    .select("id, username, display_name, birth_sex, is_admin")
    .eq("username", username)
    .maybeSingle();
  if (!counterpart || counterpart.id === user.id) notFound();

  // Admins send without credits (enforced in the send_message RPC);
  // this just keeps the paywall from popping at them.
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const iAmAdmin = myProfile?.is_admin ?? false;

  const [{ data: messages }, entitlements] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${counterpart.id}),` +
          `and(sender_id.eq.${counterpart.id},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true }),
    getEntitlementSummary(user.id),
  ]);

  return (
    <>
      <AppNav />
      <main className="mx-auto flex w-full max-w-md flex-col px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AvatarFallback
              name={counterpart.username}
              sex={counterpart.birth_sex}
              isAdmin={counterpart.is_admin}
              sizeClass="size-9"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                {counterpart.display_name ?? counterpart.username}
                {counterpart.is_admin && (
                  <span className="ml-1.5 rounded-pill bg-success px-2 py-0.5 text-xs font-bold text-bg">
                    Admin
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-faint">@{counterpart.username}</p>
            </div>
          </div>
          {entitlements.canRead && entitlements.readPassExpiresAt && (
            <PassCountdown expiresAt={entitlements.readPassExpiresAt} />
          )}
        </div>

        {!entitlements.canRead && (
          <p className="mt-4 rounded-md bg-surface-2 p-3 text-xs text-ink-soft">
            You&apos;re seeing only the messages you sent. Unlock your inbox to
            read replies.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {(messages ?? []).map((message) => {
            const mine = message.sender_id === user.id;
            return (
              <li
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-lg p-3 text-sm",
                  mine
                    ? "self-end bg-amber text-bg"
                    : "self-start border border-line bg-surface text-ink"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={cn("mt-1 flex items-center justify-end gap-2 text-xs", mine ? "text-bg/80" : "text-ink-faint")}>
                  {!mine && <ReportButton kind="message" messageId={message.id} compact />}
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            );
          })}
          {(messages ?? []).length === 0 && (
            <li className="text-sm text-ink-faint">Say hello — this thread is empty.</li>
          )}
        </ul>

        <ThreadComposer
          recipientId={counterpart.id}
          recipientUsername={counterpart.username}
          canSend={entitlements.canSend || iAmAdmin}
        />
      </main>
    </>
  );
}
