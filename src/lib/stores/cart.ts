"use client";

/**
 * Cart — only for parts whose effective sales mode is "direct" (price shown).
 * Dormant while the site is quote-only: nothing renders AddToCartButton unless
 * a product has `salesMode === "direct"`, and the header shows the cart link
 * only when bootstrap `direct_orders_enabled` is true. The backend re-checks
 * prices and modes at checkout, so `unitPrice` here is display-only.
 */
import { useCallback, useSyncExternalStore } from "react";
import { createPersistentListStore } from "./persistent-list";

export interface CartItem {
  productSlug: string;
  partNumber: string;
  name: string;
  qty: number;
  unitPrice: number;
}

function validate(raw: unknown): CartItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.productSlug !== "string" || !r.productSlug) return null;
  const qty = Math.min(Math.max(Math.floor(Number(r.qty)) || 1, 1), 100_000);
  const unitPrice = Number(r.unitPrice);
  return {
    productSlug: r.productSlug.slice(0, 200),
    partNumber: typeof r.partNumber === "string" ? r.partNumber.slice(0, 120) : "",
    name: typeof r.name === "string" ? r.name.slice(0, 500) : "",
    qty,
    unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
  };
}

export const cartStore = createPersistentListStore<CartItem>("re:cart:v1", validate);

export function addToCart(item: Omit<CartItem, "qty"> & { qty?: number }) {
  cartStore.set((prev) => {
    const i = prev.findIndex((p) => p.productSlug === item.productSlug);
    const add = Math.max(1, Math.floor(item.qty ?? 1));
    if (i >= 0) {
      const next = [...prev];
      next[i] = { ...prev[i], qty: prev[i].qty + add, unitPrice: item.unitPrice };
      return next;
    }
    return [...prev, { ...item, qty: add }];
  });
}

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  return {
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotal: items.reduce((n, i) => n + i.qty * i.unitPrice, 0),
    add: addToCart,
    remove: useCallback(
      (slug: string) => cartStore.set((prev) => prev.filter((p) => p.productSlug !== slug)),
      [],
    ),
    clear: useCallback(() => cartStore.clear(), []),
  };
}
