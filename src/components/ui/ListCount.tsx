"use client";

import { useQuoteList } from "@/lib/stores/quote-list";
import { useCart } from "@/lib/stores/cart";
import { cn } from "@/lib/utils";

/** Quote-list line count badge. Renders nothing on the server / when empty. */
export function QuoteCount({ className }: { className?: string }) {
  const { count } = useQuoteList();
  return <CountBubble count={count} className={className} />;
}

export function CartCount({ className }: { className?: string }) {
  const { count } = useCart();
  return <CountBubble count={count} className={className} />;
}

function CountBubble({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "re-mono inline-grid h-5 min-w-5 place-items-center rounded-full bg-re-red px-1 text-[0.6875rem] font-semibold leading-none text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
