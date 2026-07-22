import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { isProductKind } from "@/lib/billing/products";
import { READ_PASS_MINUTES } from "@/lib/constants";

/**
 * POST /api/stripe/webhook
 *
 * The ONLY place where money turns into access:
 *  1. Verify the Stripe signature (reject forgeries).
 *  2. Record the event id first — a replay hits the primary key and
 *     grants nothing twice (idempotency).
 *  3. Grant / sync entitlements with the SERVICE role client.
 * Unhandled event types return 200 (acknowledged, ignored).
 * Failures return 500 so Stripe retries.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const service = createServiceClient();

  // Idempotency: claim the event id before doing anything else.
  const { error: claimError } = await service
    .from("processed_stripe_events")
    .insert({ id: event.id });
  if (claimError) {
    // 23505 unique_violation = already processed: acknowledge and stop.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(service, stripe, event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(service, event.data.object);
        break;
      default:
        break; // acknowledged, intentionally ignored
    }
  } catch (error) {
    console.error("Webhook processing failed", event.type, error);
    // Un-claim so Stripe's retry can succeed.
    await service.from("processed_stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type ServiceClient = ReturnType<typeof createServiceClient>;

async function handleCheckoutCompleted(
  service: ServiceClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const productKind = session.metadata?.product_kind;
  if (!userId || !productKind || !isProductKind(productKind)) {
    throw new Error("Checkout session missing user_id / product_kind metadata");
  }

  // Audit trail first.
  await service.from("transactions").insert({
    user_id: userId,
    product: productKind,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    status: "succeeded",
  } as never);

  if (productKind === "single_message") {
    await grantCredit(service, userId, "message_credit");
    return;
  }

  if (productKind === "gender_insight") {
    await grantCredit(service, userId, "gender_reveal");
    return;
  }

  if (productKind === "read_pass") {
    const expiresAt = new Date(Date.now() + READ_PASS_MINUTES * 60_000).toISOString();
    await service.from("user_entitlements").insert({
      user_id: userId,
      type: "read_pass",
      expires_at: expiresAt,
    } as never);
    return;
  }

  // Subscriptions: pull the live subscription for its period end.
  if (typeof session.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await upsertSubscriptionEntitlement(service, userId, subscription);
  }
}

/**
 * Adds one consumable credit of the given type: tops up the user's
 * existing active row if there is one, else creates it. Used for both
 * message credits and gender-split reveals.
 */
async function grantCredit(
  service: ServiceClient,
  userId: string,
  type: "message_credit" | "gender_reveal"
) {
  const { data: existing } = await service
    .from("user_entitlements")
    .select("id, credits_remaining")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("active", true)
    .maybeSingle();

  if (existing) {
    await service
      .from("user_entitlements")
      .update({ credits_remaining: (existing.credits_remaining ?? 0) + 1 } as never)
      .eq("id", existing.id);
  } else {
    await service.from("user_entitlements").insert({
      user_id: userId,
      type,
      credits_remaining: 1,
    } as never);
  }
}

/** Keeps the subscription entitlement in sync with Stripe's state. */
async function syncSubscription(service: ServiceClient, subscription: Stripe.Subscription) {
  const { data: existing } = await service
    .from("user_entitlements")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (!existing) return; // subscription we never granted: nothing to sync

  const isAlive = subscription.status === "active" || subscription.status === "trialing";
  await service
    .from("user_entitlements")
    .update({
      active: isAlive,
      expires_at: subscriptionPeriodEnd(subscription),
    } as never)
    .eq("id", existing.id);
}

async function upsertSubscriptionEntitlement(
  service: ServiceClient,
  userId: string,
  subscription: Stripe.Subscription
) {
  const { data: existing } = await service
    .from("user_entitlements")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const fields = {
    user_id: userId,
    type: "subscription" as const,
    stripe_subscription_id: subscription.id,
    active: true,
    expires_at: subscriptionPeriodEnd(subscription),
  };

  if (existing) {
    await service.from("user_entitlements").update(fields as never).eq("id", existing.id);
  } else {
    await service.from("user_entitlements").insert(fields as never);
  }
}

/**
 * Stripe moved current_period_end from the Subscription object onto its
 * items in newer API versions. Read whichever is present.
 */
function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end;
  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const unixSeconds = fromItem ?? legacy;
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}
