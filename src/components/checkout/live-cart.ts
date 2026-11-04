"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { cartStore, type CartItem } from "@/lib/stores/cart";
import { addToQuote } from "@/lib/stores/quote-list";
import { CHECKOUT_MAX_QTY } from "@/lib/forms/schemas";

export interface LiveLine {
  productSlug: string;
  name: string;
  partNumber: string;
  price: number | null;
  direct: boolean;
  availableQty: number;
  found: boolean;
}

/**
 * Current backend price / sales mode for each cart line (the stored
 * unitPrice is display-only). `null` while loading or when the check
 * failed — callers then fall back to the stored price.
 */
export function useLiveLines(items: readonly CartItem[]): { lines: Map<string, LiveLine> | null; failed: boolean } {
  const locale = useLocale();
  const key = items.map((i) => i.productSlug).sort().join("|");
  const [state, setState] = useState<{ key: string; lines: Map<string, LiveLine> | null; failed: boolean }>({ key: "", lines: null, failed: false });

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch("/api/checkout/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: key.split("|"), locale }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d: { lines: LiveLine[] | null }) => {
        if (!Array.isArray(d.lines)) throw new Error("unavailable");
        setState({ key, lines: new Map(d.lines.map((l) => [l.productSlug, l])), failed: false });
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name !== "AbortError") setState({ key, lines: null, failed: true });
      });
    return () => ctrl.abort();
  }, [key, locale]);

  return state.key === key ? { lines: state.lines, failed: state.failed } : { lines: null, failed: false };
}

export function setCartQty(slug: string, qty: number) {
  const q = Math.min(Math.max(Math.floor(qty) || 1, 1), CHECKOUT_MAX_QTY);
  cartStore.set((prev) => prev.map((p) => (p.productSlug === slug ? { ...p, qty: q } : p)));
}

/** Move cart lines (quote-only parts) to the quote list. Returns how many moved. */
export function moveToQuote(slugs: string[]): number {
  const set = new Set(slugs);
  const moving = cartStore.getSnapshot().filter((i) => set.has(i.productSlug));
  for (const i of moving) addToQuote({ productSlug: i.productSlug, partNumber: i.partNumber, name: i.name, qty: i.qty });
  cartStore.set((prev) => prev.filter((p) => !set.has(p.productSlug)));
  return moving.length;
}

/** Unit price to show: live when known and direct, else the stored one. */
export const unitPrice = (item: CartItem, live?: LiveLine) => (live && live.direct && live.price !== null ? live.price : item.unitPrice);
