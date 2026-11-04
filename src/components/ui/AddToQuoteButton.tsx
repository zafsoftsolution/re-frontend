"use client";

import { useState } from "react";
import { Check, ListPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuoteList, quoteItemKey } from "@/lib/stores/quote-list";
import { announce } from "@/lib/announce";
import { buttonClass, type ButtonSize } from "./button-styles";

/**
 * Primary CTA on every part (quote-first). Adds the part to the persistent
 * quote list, or bumps its quantity if it's already there.
 */
export function AddToQuoteButton({
  productSlug,
  partNumber,
  name,
  qty = 1,
  size = "md",
  variant = "primary",
  className,
}: {
  productSlug: string;
  partNumber: string;
  name: string;
  qty?: number;
  size?: ButtonSize;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const t = useTranslations("ui");
  const { items, add } = useQuoteList();
  const [justAdded, setJustAdded] = useState(false);
  const existing = items.find((i) => quoteItemKey(i) === quoteItemKey({ productSlug, partNumber, name }));
  const label = justAdded ? t("addedToQuote") : existing ? t("inQuote", { qty: existing.qty }) : t("addToQuote");
  // Distinct name per row ("Add to quote, B1109-552") — starts with the
  // visible text (WCAG 2.5.3 label in name).
  const which = partNumber || name;

  return (
    <button
      type="button"
      aria-label={which ? `${label}, ${which}` : undefined}
      onClick={() => {
        add({ productSlug, partNumber, name, qty });
        setJustAdded(true);
        announce(which ? `${t("addedToQuote")}: ${which}` : t("addedToQuote"));
        setTimeout(() => setJustAdded(false), 1600);
      }}
      className={buttonClass({ variant, size }, className)}
    >
      {justAdded ? (
        <Check aria-hidden className="animate-re-tick" strokeWidth={2.25} />
      ) : (
        <ListPlus aria-hidden strokeWidth={1.75} />
      )}
      <span>{label}</span>
    </button>
  );
}
