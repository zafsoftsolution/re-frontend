"use client";

import { useTranslations } from "next-intl";
import { useQuoteList } from "@/lib/stores/quote-list";
import { useCart } from "@/lib/stores/cart";
import { cn } from "@/lib/utils";

/** Quote-list line count badge. Renders nothing on the server / when empty.
 *  The bubble is visual only; screen readers get "Quote list: 3 items". */
export function QuoteCount({ className }: { className?: string }) {
  const t = useTranslations("header");
  const { count } = useQuoteList();
  return <CountBubble count={count} label={t("rfqItems", { count })} className={className} />;
}

export function CartCount({ className }: { className?: string }) {
  const t = useTranslations("header");
  const { count } = useCart();
  return <CountBubble count={count} label={t("cartItems", { count })} className={className} />;
}

function CountBubble({ count, label, className }: { count: number; label: string; className?: string }) {
  if (count === 0) return null;
  return (
    <>
      <span className="sr-only">{` (${label})`}</span>
      <span
      aria-hidden
      className={cn(
        "re-mono inline-grid h-5 min-w-5 place-items-center rounded-full bg-re-red-dark px-1 text-[0.6875rem] font-semibold leading-none text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
      </span>
    </>
  );
}
