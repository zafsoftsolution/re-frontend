"use client";

import type { ReactNode, RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-screen sheet for the phone shell (menu, search). Base UI Dialog gives
 * the focus trap, Esc, scroll lock and inert background. On phones it covers
 * the screen like a native screen; from md up it is a right-hand panel.
 * Slides up 16px + fades in 180ms (instant with reduced motion).
 */
export function FullSheet({
  open,
  onOpenChange,
  title,
  titleHidden = false,
  closeLabel,
  header,
  initialFocus,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Keep the title for assistive tech only (the header slot shows something else). */
  titleHidden?: boolean;
  closeLabel: string;
  /** Replaces the default title row (e.g. the search field). */
  header?: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 hidden bg-re-ink/45 transition-opacity duration-150 ease-re data-ending-style:opacity-0 data-starting-style:opacity-0 md:block" />
        <Dialog.Popup
          initialFocus={initialFocus}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-re-steel-50 outline-none",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            "transition-[transform,opacity] duration-180 ease-re",
            "data-ending-style:translate-y-4 data-ending-style:opacity-0 data-starting-style:translate-y-4 data-starting-style:opacity-0",
            "md:left-auto md:w-[28rem] md:border-l md:border-re-steel-200 md:shadow-re-float",
            className,
          )}
        >
          {header ? (
            <>
              <Dialog.Title className={cn(titleHidden && "sr-only")}>{title}</Dialog.Title>
              {header}
            </>
          ) : (
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-re-steel-200 bg-re-paper pr-1 pl-4">
              <span aria-hidden className="absolute inset-x-0 top-[env(safe-area-inset-top)] h-[3px] bg-re-red" />
              <Dialog.Title className="min-w-0 truncate text-[1.25rem] font-bold [font-stretch:82%] bn:font-re-bn-display bn:text-[1.1875rem] bn:font-semibold bn:[font-stretch:100%]">
                {title}
              </Dialog.Title>
              <Dialog.Close
                aria-label={closeLabel}
                className="grid size-12 shrink-0 place-items-center text-re-ink active:bg-re-steel-100"
              >
                <X aria-hidden className="size-6" strokeWidth={1.75} />
              </Dialog.Close>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SheetClose = Dialog.Close;
