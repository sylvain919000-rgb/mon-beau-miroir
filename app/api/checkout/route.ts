import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";
import { PRODUCTS, isProductKind, stripePriceId } from "@/lib/billing/products";

/**
 * POST /api/checkout  { product: ProductKind, returnTo: string }
 *
 * Creates a Stripe Checkout Session for the signed-in user and returns
 * its URL. One Stripe customer per user, created lazily on first
 * purchase and stored by the SERVICE role (users cannot write that
 * column — see migration 0003).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json()) as { product?: string; returnTo?: string };
  if (!body.product || !isProductKind(body.product)) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  // Only same-site paths are allowed as return targets.
  const returnTo =
    body.returnTo && body.returnTo.startsWith("/") && !body.returnTo.startsWith("//")
      ? body.returnTo
      : "/inbox";

  const product = PRODUCTS[body.product];
  const stripe = getStripe();

  // Find or create this user's Stripe customer.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const service = createServiceClient();
    await service
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // Prefer the configured URL, else the caller's own origin — never a
  // hardcoded localhost, which would strand live checkouts.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    request.headers.get("origin") ??
    "https://mon-beau-miroir.bereytapps.com";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: product.mode,
    line_items: [{ price: stripePriceId(product.kind), quantity: 1 }],
    // The webhook reads these to know who bought what.
    metadata: { user_id: user.id, product_kind: product.kind },
    success_url: `${appUrl}${returnTo}?purchase=success`,
    cancel_url: `${appUrl}${returnTo}?purchase=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
