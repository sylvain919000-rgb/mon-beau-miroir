"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/messages/actions";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/paywall-modal";
import { cn } from "@/lib/cn";

interface ThreadComposerProps {
  recipientId: string;
  recipientUsername: string;
  /** Server-computed hint: opens the paywall up-front when false. The
   *  database re-checks on send either way. */
  canSend: boolean;
}

export function ThreadComposer({ recipientId, recipientUsername, canSend }: ThreadComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!body.trim()) return;
    if (!canSend) {
      setPaywallOpen(true);
      return;
    }
    setSending(true);
    setError(null);
    const result = await sendMessage(recipientId, body);
    setSending(false);

    if (result.ok) {
      setBody("");
      router.refresh(); // pull the new message into the thread
    } else if (result.reason === "paywall") {
      setPaywallOpen(true); // hint was stale: the DB said no
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder={`Message @${recipientUsername}…`}
          aria-label={`Message to ${recipientUsername}`}
          className={cn(
            "flex-1 resize-none rounded-md border border-line bg-bg p-3 text-sm text-ink",
            "placeholder:text-ink-faint focus:border-amber"
          )}
        />
        <Button onClick={handleSend} loading={sending} disabled={!body.trim()}>
          Send
        </Button>
      </div>
      <PaywallModal
        variant="send"
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        recipientUsername={recipientUsername}
        returnTo={`/inbox/${recipientUsername}`}
      />
    </div>
  );
}
