import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on every request (see /middleware.ts):
 * 1. Refreshes the Supabase session cookie so it never silently expires.
 * 2. Redirects signed-out visitors away from protected pages.
 * 3. Redirects signed-in users who haven't finished onboarding to /onboarding.
 */
const PROTECTED_PREFIXES = ["/me", "/onboarding", "/feed", "/inbox", "/settings", "/p/", "/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Signed-in users must finish onboarding (username + consents) first.
  if (user && needsAuth && path !== "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tos_accepted_at")
      .eq("id", user.id)
      .single();

    if (profile && !profile.tos_accepted_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
