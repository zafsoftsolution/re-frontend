"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { QUOTE_MAX_QTY } from "@/lib/stores/quote-list";

/**
 * Quantity stepper + Add to quote (primary). `direct` is passed only for
 * direct-sale parts, so a quote part's price never reaches the client.
 */
export function PartBuyBox({
  productSlug,
  partNumber,
  name,
  moq,
  direct,
  labels,
}: {
  productSlug: string;
  partNumber: string;
  name: string;
  moq: number;
  direct?: { price: number };
  labels: { qty: string; decrease: string; increase: string };
}) {
  const min = Math.max(1, moq);
  const [qty, setQty] = useState(min);
  const clamp = (n: number) => Math.min(Math.max(Number.isFinite(n) ? Math.floor(n) : min, min), QUOTE_MAX_QTY);
  const btn =
    "grid size-12 shrink-0 place-items-center text-re-ink transition-colors duration-150 hover:bg-re-steel-100 disabled:text-re-steel-400 disabled:hover:bg-transparent";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="re-label mb-1.5 block">{labels.qty}</span>
          <span className="inline-flex items-stretch rounded-re border border-re-steel-400 bg-re-paper focus-within:border-re-blue">
            <button type="button" className={btn} aria-label={labels.decrease} disabled={qty <= min} onClick={() => setQty((q) => clamp(q - 1))}>
              <Minus aria-hidden className="size-4" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={min}
              step={1}
              value={qty}
              onChange={(e) => setQty(clamp(e.target.valueAsNumber))}
              className="re-mono w-20 border-x border-re-steel-200 bg-transparent text-center text-lg font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button type="button" className={btn} aria-label={labels.increase} onClick={() => setQty((q) => clamp(q + 1))}>
              <Plus aria-hidden className="size-4" />
            </button>
          </span>
        </label>
        <AddToQuoteButton
          productSlug={productSlug}
          partNumber={partNumber}
          name={name}
          qty={qty}
          size="lg"
          variant={direct ? "secondary" : "primary"}
          className="h-12 min-w-[12rem] flex-1 sm:flex-none"
        />
        {direct && (
          <AddToCartButton
            salesMode="direct"
            price={direct.price}
            productSlug={productSlug}
            partNumber={partNumber}
            name={name}
            qty={qty}
            size="lg"
            className="h-12 flex-1 border-re-red bg-re-red text-white hover:border-re-red-dark hover:bg-re-red-dark sm:flex-none"
          />
        )}
      </div>
    </div>
  );
}
