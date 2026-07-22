"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element:
 * focus trapping, Esc-to-close and backdrop clicks come for free.
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the dimmed backdrop (the dialog element itself) closes it.
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={cn(
        "m-auto w-[min(92vw,28rem)] rounded-lg bg-bg p-6 shadow-modal",
        "backdrop:bg-ink/40 backdrop:backdrop-blur-sm",
        "open:animate-[mbm-pop_var(--mbm-dur-base)_var(--ease-mbm)]",
        className
      )}
    >
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}
