"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([tabindex="-1"]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Minimal modal dialog for admin action forms (send quote, convert…).
 * Escape / backdrop click closes, focus moves into the panel on open, Tab
 * is trapped inside it, and focus returns to the opener on close.
 */
export default function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the focus effect: parents pass inline
  // arrows, and re-running on every render would yank focus back to the
  // first field while the admin types.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      "input, select, textarea, button:not([data-dialog-close])",
    );
    (first ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Trap Tab inside the panel (aria-modal).
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
      );
      if (!items.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panel || !panel.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (active === lastEl || !panel.contains(active))) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        data-dialog-close
        tabIndex={-1}
        onClick={() => onCloseRef.current()}
        className="absolute inset-0 bg-black/45"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-white border-t-2 border-re-red shadow-2xl max-h-[92vh] flex flex-col outline-none",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-[var(--jmn-line)]">
          <div>
            <h2 id={titleId} className="text-lg text-navy">
              {title}
            </h2>
            {description && <div className="mt-1 text-[13px] text-ink/60">{description}</div>}
          </div>
          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 -mr-2 grid place-items-center text-ink/60 hover:text-navy"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-[var(--jmn-line)] flex flex-wrap justify-end gap-2 bg-re-steel-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared button styles for admin action UIs. */
export const btn = {
  primary:
    "h-10 px-4 inline-flex items-center justify-center gap-2 bg-re-red-cta text-white text-[13px] font-semibold hover:bg-re-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150",
  secondary:
    "h-10 px-4 inline-flex items-center justify-center gap-2 bg-white border border-re-ink text-re-ink text-[13px] font-medium hover:bg-re-steel-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150",
  ghost:
    "h-10 px-3 inline-flex items-center justify-center gap-2 text-[13px] font-medium text-re-ink hover:bg-re-steel-100 disabled:opacity-50 transition-colors duration-150",
  danger:
    "h-10 px-4 inline-flex items-center justify-center gap-2 bg-white border border-rose-300 text-rose-800 text-[13px] font-medium hover:bg-rose-50 disabled:opacity-50 transition-colors duration-150",
  whatsapp:
    "h-10 px-4 inline-flex items-center justify-center gap-2 bg-re-whatsapp text-white text-[13px] font-semibold hover:brightness-95 transition-colors duration-150",
};

export const field = {
  label: "block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink/65 mb-1",
  input:
    "w-full h-10 px-3 bg-white border border-re-steel-300 text-sm text-re-ink outline-none focus:border-re-blue disabled:bg-re-steel-50",
  textarea:
    "w-full px-3 py-2 bg-white border border-re-steel-300 text-sm text-re-ink outline-none focus:border-re-blue",
  hint: "mt-1 text-[12px] text-ink/60",
  error: "mt-1 text-[12px] text-rose-700",
};
