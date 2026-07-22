"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/paywall-modal";
import { copy } from "@/lib/copy";

/** The read paywall entry point under the (free) teaser list. */
export function InboxUnlock() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-4 text-center">
      <p className="text-sm font-semibold text-ink">{copy.paywall.readTitle}</p>
      <p className="mt-1 text-xs text-ink-soft">{copy.paywall.keepNote}</p>
      <Button className="mt-3" onClick={() => setOpen(true)}>
        Unlock my inbox
      </Button>
      <PaywallModal variant="read" open={open} onClose={() => setOpen(false)} returnTo="/inbox" />
    </div>
  );
}
