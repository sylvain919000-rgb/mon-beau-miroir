import Stripe from "stripe";

/**
 * Lazily constructed Stripe client (server-only). Instantiating inside a
 * function keeps builds green when env vars are absent and makes it
 * impossible to import into client code without an immediate error.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing env var STRIPE_SECRET_KEY");
  }
  return new Stripe(secretKey);
}
