import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AvatarFallback } from "@/components/fallbacks/avatar-fallback";
import { PassCountdown } from "@/components/pass-countdown";
import { InboxUnlock } from "./inbox-unlock";
import { createClient } from "@/lib/supabase/server";
import { getEntitlementSummary } from "@/lib/billing/entitlements";

/**
 * The inbox. Teasers (who wrote, when) are ALWAYS shown for free via the
 * get_inbox_teasers RPC — the paywall is never blind. With read access
 * (subscription or a live 15-minute pass), rows link into full threads.
 */
export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: teasers }, entitlements] = await Promise.all([
    supabase.rpc("get_inbox_teasers"),
    getEntitlementSummary(user.id),
  ]);

  // One row per sender, newest first, with a message count.
  const bySender = new Map<string, { latest: string; count: number }>();
  for (const teaser of teasers ?? []) {
    const existing = bySender.get(teaser.sender_username);
    if (existing) {
      existing.count += 1;
    } else {
      bySender.set(teaser.sender_username, { latest: teaser.created_at, count: 1 });
    }
  }
  const conversations = [...bySender.entries()];

  // Avatar colors for the senders (blue = male, green = admin).
  const senderUsernames = conversations.map(([senderUsername]) => senderUsername);
  const { data: senderProfiles } = senderUsernames.length
    ? await supabase
        .from("profiles")
        .select("username, birth_sex, is_admin")
        .in("username", senderUsernames)
    : { data: [] };
  const senderByUsername = new Map(
    (senderProfiles ?? []).map((profile) => [profile.username, profile])
  );

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink">Inbox</h1>
          {entitlements.canRead && entitlements.readPassExpiresAt && (
            <PassCountdown expiresAt={entitlements.readPassExpiresAt} />
          )}
        </div>

        {conversations.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">
            No messages yet. When someone writes to you, their name shows up here.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {conversations.map(([senderUsername, info]) => (
              <li key={senderUsername}>
                <Link
                  href={entitlements.canRead ? `/inbox/${senderUsername}` : "/inbox"}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-surface-2"
                >
                  <AvatarFallback
                    name={senderUsername}
                    sex={senderByUsername.get(senderUsername)?.birth_sex ?? null}
                    isAdmin={senderByUsername.get(senderUsername)?.is_admin ?? false}
                    sizeClass="size-9"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      @{senderUsername}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {info.count} {info.count === 1 ? "message" : "messages"} · latest{" "}
                      {new Date(info.latest).toLocaleString()}
                    </span>
                  </span>
                  {!entitlements.canRead && <span aria-hidden>🔒</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!entitlements.canRead && conversations.length > 0 && (
          <InboxUnlock />
        )}
      </main>
    </>
  );
}
