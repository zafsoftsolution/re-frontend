"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { QtyInput } from "@/components/ui/QtyInput";
import { WhatsAppIcon } from "@/components/icons/brand";
import { QUOTE_MAX_QTY } from "@/lib/stores/quote-list";

/**
 * Phone / tablet action bar for a part page: qty stepper · Add to quote
 * (Add to cart for direct-sale parts) · WhatsApp, fixed to the bottom edge.
 *
 * `data-page-actions` contract with the site shell: while an element with
 * this attribute is on the page, the shell hides its own bottom tab bar
 * (`body:has([data-page-actions])`), and this bar takes its place — same
 * edge, same height (4rem + the safe-area inset), same breakpoint (< lg).
 * The shell's existing bottom padding / scroll-padding therefore still fit.
 * It sits one layer above the tab bar (z-45 vs z-40), so it also covers the
 * tab bar on a shell that doesn't hide it yet.
 */
export function PartActionBar({
  productSlug,
  partNumber,
  name,
  moq,
  direct,
  whatsapp,
  labels,
}: {
  productSlug: string;
  partNumber: string;
  name: string;
  moq: number;
  direct?: { price: number };
  /** Prefilled wa.me link, or a /contact fallback href when no number is set. */
  whatsapp: { href: string; external: boolean };
  labels: { qty: string; decrease: string; increase: string; whatsapp: string; region: string };
}) {
  const min = Math.max(1, moq);
  const [qty, setQty] = useState(min);
  const clamp = (n: number) => Math.min(Math.max(Number.isFinite(n) ? Math.floor(n) : min, min), QUOTE_MAX_QTY);
  const step =
    "grid h-12 w-11 shrink-0 place-items-center text-re-ink active:bg-re-steel-100 disabled:text-re-steel-400";

  return (
    <div
      data-page-actions
      role="region"
      aria-label={labels.region}
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-re-ink bg-re-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex h-[3.75rem] max-w-3xl items-center gap-1.5 px-3 xs:gap-2">
        <div className="inline-flex shrink-0 items-stretch rounded-re border border-re-steel-500 bg-re-paper focus-within:border-re-blue">
          <button type="button" className={step} aria-label={labels.decrease} disabled={qty <= min} onClick={() => setQty((q) => clamp(q - 1))}>
            <Minus aria-hidden className="size-4" />
          </button>
          <label className="flex">
            <span className="sr-only">{labels.qty}</span>
            <QtyInput
              value={qty}
              min={min}
              max={QUOTE_MAX_QTY}
              onCommit={setQty}
              className="re-mono h-12 w-11 border-x border-re-steel-200 bg-transparent text-center text-base font-semibold outline-none"
            />
          </label>
          <button type="button" className={step} aria-label={labels.increase} onClick={() => setQty((q) => clamp(q + 1))}>
            <Plus aria-hidden className="size-4" />
          </button>
        </div>

        {direct ? (
          <AddToCartButton
            salesMode="direct"
            directOrdersEnabled
            price={direct.price}
            productSlug={productSlug}
            partNumber={partNumber}
            name={name}
            qty={qty}
            className="h-12 min-w-0 flex-1 border-re-red-dark bg-re-red-dark px-3 text-white hover:bg-re-red-deep [&>span]:truncate"
          />
        ) : (
          <AddToQuoteButton
            productSlug={productSlug}
            partNumber={partNumber}
            name={name}
            qty={qty}
            countBadge
            className="h-12 min-w-0 flex-1 px-2.5 text-[0.9375rem] bn:text-[0.875rem] max-[389px]:[&>svg]:hidden [&>span]:truncate"
          />
        )}

        <a
          href={whatsapp.href}
          {...(whatsapp.external ? { target: "_blank", rel: "noopener" } : {})}
          aria-label={labels.whatsapp}
          title={labels.whatsapp}
          className="grid h-12 w-11 shrink-0 place-items-center rounded-re bg-re-whatsapp text-white active:bg-re-whatsapp-dark [&_svg]:size-6"
        >
          <WhatsAppIcon />
        </a>
      </div>
    </div>
  );
}
