"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sheet: bottom sheet on mobile, right-hand panel from md up. Built on Base UI
 * Dialog (focus trap, Esc, scroll lock, inert background). Pass `trigger` as
 * an element; Base UI merges its props via `render`.
 */
export function Sheet({
  trigger,
  title,
  description,
  children,
  closeLabel,
  open,
  onOpenChange,
  fullHeight = false,
  footer,
  className,
}: {
  trigger?: React.ReactElement;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  closeLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Phones: take the whole screen (long forms such as listing filters). */
  fullHeight?: boolean;
  /** Pinned below the scrolling body (e.g. a "Show 24 results" button). */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger render={trigger} />}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-re-ink/45 transition-opacity duration-150 ease-re data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-re-paper shadow-re-float outline-none",
            "transition-[transform,opacity] duration-180 ease-re data-ending-style:opacity-0 data-starting-style:opacity-0",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-re border-t-[3px] border-re-red",
            !footer && "pb-[env(safe-area-inset-bottom)]",
            fullHeight && "max-md:top-0 max-md:h-dvh max-md:max-h-none max-md:rounded-none",
            "data-ending-style:translate-y-6 data-starting-style:translate-y-6",
            // Desktop: side panel
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[26rem] md:rounded-none md:border-t-0 md:border-l md:border-l-re-steel-200",
            "md:data-ending-style:translate-x-6 md:data-ending-style:translate-y-0 md:data-starting-style:translate-x-6 md:data-starting-style:translate-y-0",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-re-steel-200 px-4 py-3">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-re-steel-600">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={closeLabel}
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-re text-re-ink hover:bg-re-steel-100"
            >
              <X aria-hidden className="size-5" strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
          {footer && (
            <div className="border-t border-re-steel-200 bg-re-paper px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
