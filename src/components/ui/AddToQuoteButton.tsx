"use client";

import { useState } from "react";
import { Check, ListPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuoteList, quoteItemKey } from "@/lib/stores/quote-list";
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

  return (
    <button
      type="button"
      onClick={() => {
        add({ productSlug, partNumber, name, qty });
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1600);
      }}
      className={buttonClass({ variant, size }, className)}
    >
      {justAdded ? (
        <Check aria-hidden className="animate-re-tick" strokeWidth={2.25} />
      ) : (
        <ListPlus aria-hidden strokeWidth={1.75} />
      )}
      <span>{justAdded ? t("addedToQuote") : existing ? t("inQuote", { qty: existing.qty }) : t("addToQuote")}</span>
      <span aria-live="polite" className="sr-only">
        {justAdded ? t("addedToQuote") : ""}
      </span>
    </button>
  );
}
