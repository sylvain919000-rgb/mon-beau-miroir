import { READ_PASS_MINUTES } from "@/lib/constants";
import type { ProductKind } from "@/lib/database.types";

/**
 * THE single source of truth for everything purchasable.
 * Prices shown here are USD display strings (tax included); the amounts
 * Stripe actually charges live on the Stripe Prices referenced by the
 * env vars. Keep both in sync when prices change.
 */
export interface ProductConfig {
  kind: ProductKind;
  name: string;
  displayPrice: string;
  description: string;
  /** Stripe Checkout mode. */
  mode: "payment" | "subscription";
  /** Env var holding the Stripe Price id. */
  priceEnvVar: string;
}

export const PRODUCTS: Record<ProductKind, ProductConfig> = {
  single_message: {
    kind: "single_message",
    name: "Single Message Pass",
    displayPrice: "$1.99",
    description: "Send this one message.",
    mode: "payment",
    priceEnvVar: "STRIPE_PRICE_SINGLE_MESSAGE",
  },
  read_pass: {
    kind: "read_pass",
    name: `${READ_PASS_MINUTES}-Minute Inbox Pass`,
    displayPrice: "$1.99",
    description: `Read everything you've received for the next ${READ_PASS_MINUTES} minutes.`,
    mode: "payment",
    priceEnvVar: "STRIPE_PRICE_READ_PASS",
  },
  gender_insight: {
    kind: "gender_insight",
    name: "Gender Split Reveal",
    displayPrice: "$1.99",
    description: "One look at how men vs. women rate you.",
    mode: "payment",
    priceEnvVar: "STRIPE_PRICE_GENDER_INSIGHT",
  },
  sub_monthly: {
    kind: "sub_monthly",
    name: "Unlimited Monthly",
    displayPrice: "$7.99/month",
    description: "Send and read without limits. Cancel anytime.",
    mode: "subscription",
    priceEnvVar: "STRIPE_PRICE_MONTHLY",
  },
  sub_annual: {
    kind: "sub_annual",
    name: "Unlimited Annual",
    displayPrice: "$59/year",
    description: "Our best price — close to 2 months free vs monthly.",
    mode: "subscription",
    priceEnvVar: "STRIPE_PRICE_ANNUAL",
  },
};

export function isProductKind(value: string): value is ProductKind {
  return value in PRODUCTS;
}

/** Reads the Stripe Price id for a product from the environment. */
export function stripePriceId(kind: ProductKind): string {
  const priceId = process.env[PRODUCTS[kind].priceEnvVar];
  if (!priceId) {
    throw new Error(`Missing env var ${PRODUCTS[kind].priceEnvVar}`);
  }
  return priceId;
}
