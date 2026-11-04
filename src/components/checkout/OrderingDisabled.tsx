"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/stores/cart";
import { buttonClass } from "@/components/ui/button-styles";
import { moveToQuote } from "./live-cart";

/**
 * Shown on /cart and /checkout while bootstrap `direct_orders_enabled` is
 * false: online ordering is off, so point to the quote flow. Anything left
 * in a stale cart can be moved to the quote list in one tap.
 */
export function OrderingDisabled() {
  const t = useTranslations("cart");
  const { items } = useCart();
  const [moved, setMoved] = useState(0);
  return (
    <div className="mt-8 max-w-2xl border-t-[3px] border-re-ink pt-6" data-testid="ordering-disabled">
      <p className="text-[1.25rem] font-bold">{t("disabledTitle")}</p>
      <p className="mt-2 text-re-steel-600">{t("disabledBody")}</p>
      {moved > 0 && <p className="mt-3 font-semibold text-re-stock-in">{t("moved", { count: moved })}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        {items.length > 0 ? (
          <button type="button" onClick={() => setMoved(moveToQuote(items.map((i) => i.productSlug)))} className={buttonClass({ variant: "primary" })}>
            {t("moveAll", { count: items.length })}
          </button>
        ) : (
          <Link href="/rfq" className={buttonClass({ variant: "primary" })}>
            {t("toQuote")}
          </Link>
        )}
        <Link href="/search" className={buttonClass({ variant: "secondary" })}>
          {t("browse")}
        </Link>
      </div>
    </div>
  );
}
