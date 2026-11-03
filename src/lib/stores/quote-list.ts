"use client";

/**
 * Quote list — the public site's primary "basket". Parts are added with
 * AddToQuoteButton and submitted together on /rfq (which pre-fills its line
 * items from here). Persisted in localStorage; no login required.
 */
import { useCallback, useSyncExternalStore } from "react";
import { normalizePartNumber } from "@/lib/part-number";
import { createPersistentListStore } from "./persistent-list";

export interface QuoteItem {
  /** Catalogue product slug; empty for free-text lines added on /rfq. */
  productSlug: string;
  partNumber: string;
  name: string;
  qty: number;
  note: string;
}

export const QUOTE_MAX_ITEMS = 200; // matches backend QuoteRequestCreateSerializer.MAX_ITEMS
export const QUOTE_MAX_QTY = 1_000_000;

const clampQty = (n: unknown) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(Math.max(v, 1), QUOTE_MAX_QTY) : 1;
};

export function quoteItemKey(item: Pick<QuoteItem, "productSlug" | "partNumber" | "name">): string {
  if (item.productSlug) return `p:${item.productSlug}`;
  const pn = normalizePartNumber(item.partNumber);
  return pn ? `n:${pn}` : `t:${item.name.trim().toLowerCase()}`;
}

function validate(raw: unknown): QuoteItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const item: QuoteItem = {
    productSlug: s(r.productSlug, 200),
    partNumber: s(r.partNumber, 120),
    name: s(r.name, 500),
    qty: clampQty(r.qty),
    note: s(r.note, 500),
  };
  return item.productSlug || item.partNumber || item.name ? item : null;
}

export const quoteListStore = createPersistentListStore<QuoteItem>("re:quote-list:v1", validate);

/** Add (or bump the quantity of) a line. Returns the resulting quantity. */
export function addToQuote(input: Omit<QuoteItem, "qty" | "note"> & { qty?: number; note?: string }): number {
  const key = quoteItemKey(input);
  let qty = clampQty(input.qty ?? 1);
  quoteListStore.set((prev) => {
    const i = prev.findIndex((p) => quoteItemKey(p) === key);
    if (i >= 0) {
      qty = clampQty(prev[i].qty + qty);
      const next = [...prev];
      next[i] = { ...prev[i], qty, note: input.note ?? prev[i].note };
      return next;
    }
    if (prev.length >= QUOTE_MAX_ITEMS) return prev;
    return [...prev, { ...input, qty, note: input.note ?? "" }];
  });
  return qty;
}

export function updateQuoteItem(key: string, patch: Partial<Pick<QuoteItem, "qty" | "note">>) {
  quoteListStore.set((prev) =>
    prev.map((p) =>
      quoteItemKey(p) === key
        ? { ...p, ...patch, qty: patch.qty === undefined ? p.qty : clampQty(patch.qty) }
        : p,
    ),
  );
}

export function removeQuoteItem(key: string) {
  quoteListStore.set((prev) => prev.filter((p) => quoteItemKey(p) !== key));
}

export function useQuoteList() {
  const items = useSyncExternalStore(
    quoteListStore.subscribe,
    quoteListStore.getSnapshot,
    quoteListStore.getServerSnapshot,
  );
  return {
    items,
    /** Number of lines (not total quantity) — what the header badge shows. */
    count: items.length,
    add: addToQuote,
    update: updateQuoteItem,
    remove: removeQuoteItem,
    clear: useCallback(() => quoteListStore.clear(), []),
  };
}
