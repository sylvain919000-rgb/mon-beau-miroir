"use server";

import { createClient } from "@/lib/supabase/server";

export type SendMessageResult =
  | { ok: true }
  | { ok: false; reason: "paywall" | "error"; message: string };

/**
 * Sends one message via the send_message RPC. The database checks the
 * entitlement and burns a credit atomically; this action just translates
 * outcomes for the UI. "paywall" tells the composer to open the send
 * paywall modal.
 */
export async function sendMessage(recipientId: string, body: string): Promise<SendMessageResult> {
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    return { ok: false, reason: "error", message: "Messages must be 1–2000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_recipient: recipientId,
    p_body: trimmed,
  });

  if (error) {
    if (error.message.includes("NO_SEND_ENTITLEMENT")) {
      return { ok: false, reason: "paywall", message: "Sending needs a pass or a subscription." };
    }
    if (error.message.includes("CANNOT_MESSAGE_SELF")) {
      return { ok: false, reason: "error", message: "You can't message yourself." };
    }
    return { ok: false, reason: "error", message: "Your message didn't send. Please try again." };
  }
  return { ok: true };
}
