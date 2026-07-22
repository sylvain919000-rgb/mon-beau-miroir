"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createReport } from "@/app/reports/actions";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/cn";

interface ReportButtonProps {
  kind: "photo" | "message";
  photoId?: string;
  messageId?: string;
  /** Compact renders a tiny flag for message bubbles. */
  compact?: boolean;
}

/**
 * The safety flag. Subtle by design, present on every photo and every
 * readable received message. Reports are anonymous to the reported user.
 */
export function ReportButton({ kind, photoId, messageId, compact = false }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setState("busy");
    setError(null);
    const result = await createReport({ photoId, messageId, reason, detail });
    if (result.error) {
      setError(result.error);
      setState("idle");
    } else {
      setState("done");
    }
  }

  function close() {
    setOpen(false);
    setReason(null);
    setDetail("");
    setState("idle");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy.report.title(kind)}
        title={copy.report.title(kind)}
        className={cn(
          "text-ink-faint transition-colors duration-[var(--mbm-dur-fast)] ease-mbm hover:text-terracotta",
          compact ? "text-xs" : "text-sm"
        )}
      >
        ⚑{!compact && " Report"}
      </button>

      <Modal open={open} onClose={close} title={copy.report.title(kind)}>
        {state === "done" ? (
          <>
            <p className="text-sm text-success">{copy.report.thanks}</p>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={close}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">Tell us what&apos;s wrong:</p>
            <ul className="mt-3 flex flex-col gap-2">
              {copy.report.reasons.map((option) => (
                <li key={option}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name={`report-reason-${photoId ?? messageId}`}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      className="accent-[var(--color-amber-strong)]"
                    />
                    {option}
                  </label>
                </li>
              ))}
            </ul>
            {reason === "Something else" && (
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={2}
                maxLength={400}
                placeholder="Tell us more…"
                aria-label="More details"
                className="mt-3 w-full resize-none rounded-md border border-line bg-bg p-3 text-sm text-ink placeholder:text-ink-faint focus:border-amber"
              />
            )}
            <p className="mt-3 text-xs text-ink-faint">{copy.report.anonymityNote}</p>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button onClick={submit} disabled={!reason} loading={state === "busy"}>
                {copy.report.submit}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
