import type { SalesMode } from "@/lib/api/types";

/**
 * A part is sold directly (price shown, Add to cart, checkout) only when its
 * effective sales mode is `direct`, the backend sent a price, AND direct
 * orders are switched on site-wide (bootstrap `direct_orders_enabled`).
 * Everything else is quote-only.
 */
export function isDirect(part: { salesMode: SalesMode; price: number | null }, directOrdersEnabled: boolean): boolean {
  return directOrdersEnabled && part.salesMode === "direct" && part.price !== null;
}
