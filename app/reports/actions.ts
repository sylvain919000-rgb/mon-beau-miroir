"use server";

import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";

export interface CreateReportInput {
  photoId?: string;
  messageId?: string;
  reason: string;
  detail?: string;
}

export interface CreateReportResult {
  error: string | null;
}

/** Files a safety report. RLS ensures reporter_id is the caller. */
export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  if (!input.photoId && !input.messageId) {
    return { error: "Nothing selected to report." };
  }
  const reasons = copy.report.reasons as readonly string[];
  if (!reasons.includes(input.reason)) {
    return { error: "Pick a reason from the list." };
  }
  const reason =
    input.reason === "Something else" && input.detail?.trim()
      ? `Something else: ${input.detail.trim().slice(0, 400)}`
      : input.reason;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    photo_id: input.photoId ?? null,
    message_id: input.messageId ?? null,
    reason,
  });
  if (error) return { error: "Could not send your report. Please try again." };
  return { error: null };
}
