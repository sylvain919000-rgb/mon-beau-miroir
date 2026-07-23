import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";

/**
 * POST /api/billing/portal
 * Opens the Stripe Customer Portal (invoices, card, one-click cancel —
 * the cancellation path EU consumer rules expect to be easy).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No purchases yet" }, { status: 400 });
  }

  const stripe = getStripe();
  // Prefer the configured URL, else the caller's own origin — never a
  // hardcoded localhost, which would strand live portal sessions.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    request.headers.get("origin") ??
    "https://mon-beau-miroir.bereytapps.com";
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });
  return NextResponse.json({ url: session.url });
}
