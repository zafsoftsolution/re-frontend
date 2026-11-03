import type { ProductSalesModeSetting, SiteSalesMode } from "@/lib/django-admin";

/**
 * Mirror of backend `catalog.effective_sales_mode`: a part is sold DIRECT
 * (price shown publicly + Add to cart) only when the site is "mixed", the
 * part's own mode is "direct" and it isn't flagged price-on-request.
 * Everything else is quote-only ("Price on request" + Add to quote).
 */
export function effectiveSalesMode(
  site: SiteSalesMode | null | undefined,
  product: ProductSalesModeSetting | null | undefined,
  priceOnRequest: boolean,
): "direct" | "quote" {
  return site === "mixed" && product === "direct" && !priceOnRequest ? "direct" : "quote";
}

export const SALES_MODE_LABEL: Record<ProductSalesModeSetting, string> = {
  inherit: "Inherit",
  quote_only: "Quote only",
  direct: "Direct",
};

export const AVAILABILITY_OVERRIDE_LABEL = {
  auto: "Automatic (from stock)",
  on_request: "Available on request",
  discontinued: "Discontinued",
} as const;

/** Public availability states returned by the API (`availability`). */
export const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  on_request: "On request",
  discontinued: "Discontinued",
};
