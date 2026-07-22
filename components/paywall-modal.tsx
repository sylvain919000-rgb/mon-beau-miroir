"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { PRODUCTS } from "@/lib/billing/products";
import { copy } from "@/lib/copy";
import type { ProductKind } from "@/lib/database.types";

interface PaywallModalProps {
  variant: "send" | "read" | "gender";
  open: boolean;
  onClose: () => void;
  /** Username shown in the send-variant title. */
  recipientUsername?: string;
  /** Same-site path Stripe should return to after checkout. */
  returnTo: string;
}

const SEND_OPTIONS: ProductKind[] = ["single_message", "sub_monthly", "sub_annual"];
const READ_OPTIONS: ProductKind[] = ["read_pass", "sub_monthly", "sub_annual"];
const GENDER_OPTIONS: ProductKind[] = ["gender_insight", "sub_monthly", "sub_annual"];

/**
 * The two monetization gates share one component so pricing display,
 * the tax note and the mandatory EU withdrawal waiver can never drift
 * apart. Checkout stays locked until the waiver box is ticked.
 */
export function PaywallModal({ variant, open, onClose, recipientUsername, returnTo }: PaywallModalProps) {
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [busyProduct, setBusyProduct] = useState<ProductKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title =
    variant === "send"
      ? copy.paywall.sendTitle(recipientUsername ?? "this member")
      : variant === "gender"
        ? copy.paywall.genderTitle
        : copy.paywall.readTitle;
  const options =
    variant === "send" ? SEND_OPTIONS : variant === "gender" ? GENDER_OPTIONS : READ_OPTIONS;

  async function startCheckout(product: ProductKind) {
    setBusyProduct(product);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, returnTo }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
      setBusyProduct(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {variant === "send" && (
        <p className="text-sm text-ink-soft">{copy.paywall.sendIntro}</p>
      )}
      {variant === "gender" && (
        <p className="text-sm text-ink-soft">{copy.paywall.genderIntro}</p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {options.map((kind) => {
          const product = PRODUCTS[kind];
          return (
            <li key={kind}>
              <Button
                variant="ghost"
                className="w-full justify-between text-left"
                disabled={!waiverAccepted}
                loading={busyProduct === kind}
                onClick={() => startCheckout(kind)}
              >
                <span className="flex flex-col items-start">
                  <span className="font-bold text-ink">
                    {product.name} — {product.displayPrice}
                  </span>
                  <span className="text-xs font-normal text-ink-soft">
                    {product.description}
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-ink-faint">{copy.paywall.vatNote}</p>
      {variant === "read" && (
        <p className="mt-1 text-xs text-ink-faint">{copy.paywall.keepNote}</p>
      )}

      <CheckboxField
        className="mt-3"
        label={copy.paywall.withdrawalWaiver}
        checked={waiverAccepted}
        onChange={(e) => setWaiverAccepted(e.target.checked)}
      />
      {!waiverAccepted && (
        <p className="mt-1 text-xs text-ink-faint">Tick the box above to choose a pass.</p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Not now
        </Button>
      </div>
    </Modal>
  );
}
