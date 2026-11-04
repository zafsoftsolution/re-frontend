"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/button-styles";
import { countMatches, type FacetRow } from "@/lib/catalog/listing";
import { cn } from "@/lib/utils";

/**
 * Phones: filters + sort in a full-height sheet. The pinned footer button
 * submits the sheet's form (`form={formId}`) and shows how many parts the
 * current choices would list, recounted on every change from slug-only
 * facet rows. Closes when its form is submitted.
 */
export function FilterSheet({
  label,
  title,
  closeLabel,
  activeCount,
  formId,
  facets,
  initialCount,
  show,
  clear,
  children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  activeCount: number;
  /** id of the <form> inside `children`. */
  formId?: string;
  facets?: FacetRow[];
  initialCount?: number;
  /** Raw button texts with a literal "{count}" placeholder. */
  show?: { one: string; other: string; none: string };
  /** "Clear filters" link, shown in the footer while filters are active. */
  clear?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount ?? 0);

  const recount = (target: EventTarget) => {
    if (!facets) return;
    const form = (target as HTMLElement).closest("form");
    if (form) setCount(countMatches(facets, new FormData(form)));
  };

  const showText = show
    ? (count === 0 ? show.none : count === 1 ? show.one : show.other).replace("{count}", String(count))
    : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setCount(initialCount ?? 0);
      }}
      title={title}
      closeLabel={closeLabel}
      fullHeight={Boolean(formId)}
      footer={
        formId && showText ? (
          <div className="flex items-center gap-3">
            {clear}
            <button
              type="submit"
              form={formId}
              aria-live="polite"
              className={buttonClass({ variant: "primary", size: "lg" }, cn("flex-1", count === 0 && "bg-re-ink hover:bg-re-ink"))}
            >
              {showText}
            </button>
          </div>
        ) : undefined
      }
      trigger={
        <button type="button" className={buttonClass({ variant: "secondary" })}>
          <SlidersHorizontal aria-hidden strokeWidth={1.75} />
          {label}
          {activeCount > 0 && (
            <span className="re-mono inline-grid h-5 min-w-5 place-items-center rounded-full bg-re-red-dark px-1 text-[0.6875rem] leading-none text-white">
              {activeCount}
            </span>
          )}
        </button>
      }
    >
      <div onSubmitCapture={() => setOpen(false)} onChangeCapture={(e) => recount(e.target)}>
        {children}
      </div>
    </Sheet>
  );
}
