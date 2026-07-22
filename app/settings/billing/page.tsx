import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { PassCountdown } from "@/components/pass-countdown";
import { ManageBillingButton } from "./manage-billing-button";
import { createClient } from "@/lib/supabase/server";
import { getEntitlementSummary } from "@/lib/billing/entitlements";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entitlements = await getEntitlementSummary(user.id);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-display text-2xl text-ink">Billing</h1>

        <dl className="mt-6 flex flex-col gap-3 text-sm">
          <div className="rounded-lg border border-line bg-surface p-4">
            <dt className="font-bold text-ink">Subscription</dt>
            <dd className="mt-1 text-ink-soft">
              {entitlements.hasActiveSubscription ? (
                <>
                  Active
                  {entitlements.subscriptionEndsAt && (
                    <> · renews or ends{" "}
                      {new Date(entitlements.subscriptionEndsAt).toLocaleDateString()}
                    </>
                  )}
                </>
              ) : (
                "None"
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <dt className="font-bold text-ink">Message credits</dt>
            <dd className="mt-1 text-ink-soft">
              {entitlements.messageCredits} unused{" "}
              {entitlements.messageCredits === 1 ? "credit" : "credits"}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <dt className="font-bold text-ink">Inbox pass</dt>
            <dd className="mt-1 text-ink-soft">
              {entitlements.readPassExpiresAt ? (
                <PassCountdown expiresAt={entitlements.readPassExpiresAt} />
              ) : (
                "No pass running"
              )}
            </dd>
          </div>
        </dl>

        <ManageBillingButton />
        <p className="mt-2 text-xs text-ink-faint">
          Invoices, payment method and one-click cancellation live in the
          secure Stripe portal.
        </p>
      </main>
    </>
  );
}
