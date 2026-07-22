"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface HighScoreGateProps {
  /** The 9 or 10 awaiting confirmation, or null when the gate is closed. */
  pendingScore: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Business rule: selecting a 9 or 10 - on the overall score OR any
 * attribute - must be confirmed before it counts. One component, reused
 * for both cases, so the rule can never drift between them.
 */
export function HighScoreGate({ pendingScore, onConfirm, onCancel }: HighScoreGateProps) {
  const open = pendingScore !== null;
  const title =
    pendingScore === 10 ? copy.highScoreModal.title10 : copy.highScoreModal.title9;

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-ink-soft">{copy.highScoreModal.body}</p>
      {pendingScore !== null && (
        <p className="mt-2 text-sm font-semibold text-ink">
          {copy.highScoreModal.question(pendingScore)}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {copy.highScoreModal.cancel}
        </Button>
        {pendingScore !== null && (
          <Button onClick={onConfirm}>{copy.highScoreModal.confirm(pendingScore)}</Button>
        )}
      </div>
    </Modal>
  );
}
