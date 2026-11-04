"use client";

import { useState } from "react";
import { Check, ListPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuoteList, quoteItemKey } from "@/lib/stores/quote-list";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/utils";
import { buttonClass, type ButtonSize } from "./button-styles";

/**
 * Primary CTA on every part (quote-first). Adds the part to the persistent
 * quote list, or bumps its quantity if it's already there.
 *
 * `iconOnly`: a 44px square for dense phone rows. The accessible name is the
 * full "Add to quote, <part no.>" and a mono count chip shows how many are
 * already in the list.
 */
export function AddToQuoteButton({
  productSlug,
  partNumber,
  name,
  qty = 1,
  size = "md",
  variant = "primary",
  iconOnly = false,
  countBadge = false,
  className,
}: {
  productSlug: string;
  partNumber: string;
  name: string;
  qty?: number;
  size?: ButtonSize;
  variant?: "primary" | "secondary";
  iconOnly?: boolean;
  /** Keep the short "Add to quote" label and show the list quantity as a
   *  corner chip (narrow bars where "In quote list (3)" would truncate). */
  countBadge?: boolean;
  className?: string;
}) {
  const t = useTranslations("ui");
  const { items, add } = useQuoteList();
  const [justAdded, setJustAdded] = useState(false);
  const existing = items.find((i) => quoteItemKey(i) === quoteItemKey({ productSlug, partNumber, name }));
  const label = justAdded
    ? t("addedToQuote")
    : existing && !countBadge
      ? t("inQuote", { qty: existing.qty })
      : t("addToQuote");
  const chip = (iconOnly || countBadge) && existing && !justAdded;
  // Distinct name per row ("Add to quote, B1109-552") — starts with the
  // visible text (WCAG 2.5.3 label in name).
  const which = partNumber || name;

  return (
    <button
      type="button"
      aria-label={
        which
          ? `${label}, ${which}${chip && countBadge ? ` — ${t("inQuote", { qty: existing.qty })}` : ""}`
          : iconOnly
            ? label
            : undefined
      }
      title={iconOnly ? label : undefined}
      onClick={() => {
        add({ productSlug, partNumber, name, qty });
        setJustAdded(true);
        announce(which ? `${t("addedToQuote")}: ${which}` : t("addedToQuote"));
        setTimeout(() => setJustAdded(false), 1600);
      }}
      className={buttonClass({ variant, size: iconOnly ? "icon" : size }, cn((iconOnly || countBadge) && "relative", className))}
    >
      {justAdded ? (
        <Check aria-hidden className="animate-re-tick" strokeWidth={2.25} />
      ) : (
        <ListPlus aria-hidden strokeWidth={1.75} />
      )}
      {!iconOnly && <span>{label}</span>}
      {chip ? (
          <span
            aria-hidden
            className="re-mono absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border border-re-paper bg-re-ink px-1 text-[0.6875rem] leading-none font-semibold text-white"
          >
            {existing.qty > 99 ? "99+" : existing.qty}
          </span>
        ) : null}
    </button>
  );
}
