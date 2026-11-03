"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/button-styles";

/** Phones: filters in a bottom sheet. Closes when its form is submitted. */
export function FilterSheet({
  label,
  title,
  closeLabel,
  activeCount,
  children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={title}
      closeLabel={closeLabel}
      trigger={
        <button type="button" className={buttonClass({ variant: "secondary" })}>
          <SlidersHorizontal aria-hidden strokeWidth={1.75} />
          {label}
          {activeCount > 0 && (
            <span className="re-mono inline-grid h-5 min-w-5 place-items-center rounded-full bg-re-red px-1 text-[0.6875rem] leading-none text-white">
              {activeCount}
            </span>
          )}
        </button>
      }
    >
      <div onSubmitCapture={() => setOpen(false)}>{children}</div>
    </Sheet>
  );
}
