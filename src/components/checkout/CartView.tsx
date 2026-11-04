"use client";

import { useState } from "react";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/stores/cart";
import { formatBDT } from "@/lib/format";
import { CHECKOUT_MAX_QTY } from "@/lib/forms/schemas";
import { PartNumber } from "@/components/ui/PartNumber";
import { buttonClass } from "@/components/ui/button-styles";
import { moveToQuote, setCartQty, unitPrice, useLiveLines } from "./live-cart";

/** /cart — direct (priced) parts only. Lines that turned quote-only are flagged with a one-tap move to the quote list. */
export function CartView() {
  const t = useTranslations("cart");
  const { items, remove } = useCart();
  const { lines } = useLiveLines(items);
  const [moved, setMoved] = useState(0);

  const blocked = lines ? items.filter((i) => !lines.get(i.productSlug)?.direct).map((i) => i.productSlug) : [];
  const subtotal = items.reduce((n, i) => n + (blocked.includes(i.productSlug) ? 0 : unitPrice(i, lines?.get(i.productSlug)) * i.qty), 0);

  if (items.length === 0) {
    return (
      <div className="mt-8 max-w-2xl border border-dashed border-re-steel-400 p-6" data-testid="cart-empty">
        {moved > 0 && <p className="mb-3 font-semibold text-re-stock-in">{t("moved", { count: moved })}</p>}
        <p className="text-lg font-semibold">{t("empty")}</p>
        <p className="mt-2 text-re-steel-600">{t("emptyHelp")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/search" className={buttonClass({ variant: "secondary" })}>
            {t("browse")}
          </Link>
          <Link href="/rfq" className={buttonClass({ variant: "primary" })}>
            {t("toQuote")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {moved > 0 && <p className="mb-3 font-semibold text-re-stock-in">{t("moved", { count: moved })}</p>}
        {blocked.length > 0 && (
          <div role="status" className="mb-4 flex flex-wrap items-center gap-3 border-l-[3px] border-re-stock-low bg-re-stock-low-bg px-4 py-3">
            <AlertTriangle aria-hidden className="size-5 text-re-stock-low" />
            <p className="min-w-0 flex-1 text-[0.9375rem]">{t("quoteOnly", { count: blocked.length })}</p>
            <button type="button" onClick={() => setMoved(moveToQuote(blocked))} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {t("moveToQuote")}
            </button>
          </div>
        )}
        <ol className="divide-y divide-re-steel-200 border-y border-re-ink">
          {items.map((i) => {
            const live = lines?.get(i.productSlug);
            const isBlocked = blocked.includes(i.productSlug);
            const price = unitPrice(i, live);
            return (
              <li key={i.productSlug} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 py-4 md:grid-cols-[minmax(0,1fr)_auto_8rem_auto] md:items-center">
                <div className="min-w-0">
                  {i.partNumber && <PartNumber value={i.partNumber} size="sm" />}
                  <Link href={`/parts/${i.productSlug}`} className="mt-1 block font-semibold hover:text-re-blue hover:underline">
                    {i.name}
                  </Link>
                  {isBlocked ? (
                    <p className="mt-1 text-[0.8125rem] font-semibold text-re-stock-low">{t("lineQuoteOnly")}</p>
                  ) : (
                    <p className="re-mono mt-1 text-[0.8125rem] text-re-steel-600">
                      {formatBDT(price)} × {i.qty}
                    </p>
                  )}
                </div>
                <span className="row-span-2 inline-flex w-max items-stretch self-start border border-re-steel-400 md:row-span-1 md:self-center">
                  <button type="button" aria-label={t("decrease")} onClick={() => setCartQty(i.productSlug, i.qty - 1)} className="grid size-11 place-items-center hover:bg-re-steel-100">
                    <Minus aria-hidden className="size-4" />
                  </button>
                  <label className="flex items-center border-x border-re-steel-400">
                    <span className="sr-only">{t("qty")}</span>
                    <input
                      inputMode="numeric"
                      value={i.qty}
                      onChange={(e) => setCartQty(i.productSlug, Number(e.target.value.replace(/\D/g, "")) || 1)}
                      className="re-mono h-11 w-14 bg-transparent text-center outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={t("increase")}
                    disabled={i.qty >= CHECKOUT_MAX_QTY}
                    onClick={() => setCartQty(i.productSlug, i.qty + 1)}
                    className="grid size-11 place-items-center hover:bg-re-steel-100 disabled:opacity-40"
                  >
                    <Plus aria-hidden className="size-4" />
                  </button>
                </span>
                <span className="re-mono text-right font-semibold md:order-none">{isBlocked ? "—" : formatBDT(price * i.qty)}</span>
                <button
                  type="button"
                  onClick={() => remove(i.productSlug)}
                  aria-label={t("remove", { name: i.name })}
                  className="grid size-11 place-items-center justify-self-end text-re-steel-600 hover:text-re-red-text"
                >
                  <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <aside className="self-start border border-re-ink lg:sticky lg:top-24">
        <p className="re-label border-b border-re-ink bg-re-ink px-4 py-2.5 !text-white/70">{t("summary")}</p>
        <dl className="px-4 py-3">
          <div className="flex items-baseline justify-between">
            <dt>{t("subtotal")}</dt>
            <dd className="re-mono text-lg font-semibold" data-testid="cart-subtotal">
              {formatBDT(subtotal)}
            </dd>
          </div>
          <p className="mt-2 text-[0.8125rem] text-re-steel-600">{t("shippingNote")}</p>
        </dl>
        <div className="p-4 pt-0">
          {blocked.length === items.length ? (
            <span aria-disabled className={buttonClass({ variant: "primary", size: "lg" }, "w-full")}>
              {t("checkout")}
            </span>
          ) : (
            <Link href="/checkout" className={buttonClass({ variant: "primary", size: "lg" }, "w-full")}>
              {t("checkout")}
            </Link>
          )}
          <Link href="/rfq" className={buttonClass({ variant: "link" }, "mt-3")}>
            {t("bulkQuote")}
          </Link>
        </div>
      </aside>
    </div>
  );
}
