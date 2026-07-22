"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approvePhoto, rejectPhoto, removePhoto, dismissReport } from "./actions";

/** Approve / reject buttons under each pending photo. */
export function PendingPhotoControls({ photoId }: { photoId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error: string | null }>) {
    start(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <Button loading={pending} onClick={() => run(() => approvePhoto(photoId))}>
          Approve
        </Button>
        <Button variant="danger" loading={pending} onClick={() => run(() => rejectPhoto(photoId))}>
          Reject
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Dismiss / reject / remove controls under each open report. */
export function ReportControls({
  reportId,
  photoId,
}: {
  reportId: string;
  photoId: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error: string | null }>) {
    start(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" loading={pending} onClick={() => run(() => dismissReport(reportId))}>
          Dismiss
        </Button>
        {photoId && (
          <>
            <Button variant="danger" loading={pending} onClick={() => run(() => rejectPhoto(photoId, reportId))}>
              Reject photo
            </Button>
            <Button variant="danger" loading={pending} onClick={() => run(() => removePhoto(photoId, reportId))}>
              Remove photo
            </Button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
