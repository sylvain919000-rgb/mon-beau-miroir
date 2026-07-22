import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AvatarFallback } from "@/components/fallbacks/avatar-fallback";
import { copy } from "@/lib/copy";

/**
 * Top navigation. Server component: reads the session once per request.
 * Feed and Inbox links arrive with Phases 2 and 3.
 */
export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = profile?.username ?? null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg text-terracotta">
          {copy.appName}
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-ink-soft">
          {user ? (
            <>
              <Link
                href="/feed"
                className="rounded-pill bg-amber px-4 py-1.5 font-semibold text-bg shadow-soft transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:bg-amber-strong"
              >
                Rate
              </Link>
              <Link href="/inbox" className="hover:text-ink">
                Inbox
              </Link>
              <Link href="/me" className="flex items-center gap-2 hover:text-ink">
              <AvatarFallback name={username ?? "?"} sizeClass="size-8" />
                <span className="hidden sm:inline">{username}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-ink">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-pill bg-amber px-4 py-1.5 font-semibold text-bg hover:bg-amber-strong"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
