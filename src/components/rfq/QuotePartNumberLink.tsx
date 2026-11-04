"use client";

import { FileQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToQuote } from "@/lib/stores/quote-list";
import { buttonClass } from "@/components/ui/button-styles";

/**
 * "Request a quote for this part number" (search with no hits): puts the
 * typed number on the quote list as a free-text line, then opens /rfq.
 * Without JS it is a plain link to /rfq.
 */
export function QuotePartNumberLink({ partNumber, label }: { partNumber: string; label: string }) {
  const t = useTranslations("rfq");
  return (
    <Link
      href="/rfq"
      onClick={() => addToQuote({ productSlug: "", partNumber: partNumber.slice(0, 120), name: t("searchedFor", { query: partNumber.slice(0, 120) }) })}
      className={buttonClass({ variant: "secondary" })}
    >
      <FileQuestion aria-hidden strokeWidth={1.75} />
      {label}
    </Link>
  );
}
