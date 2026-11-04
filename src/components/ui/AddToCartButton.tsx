"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { addToCart } from "@/lib/stores/cart";
import { announce } from "@/lib/announce";
import type { SalesMode } from "@/lib/api/types";
import { isDirect } from "@/lib/sales";
import { buttonClass, type ButtonSize } from "./button-styles";

/**
 * Only for direct-sale parts. Renders nothing for quote-only parts, or when
 * direct orders are off site-wide, so callers can drop it in
 * unconditionally: <AddToCartButton salesMode={p.salesMode} directOrdersEnabled={…} … />
 */
export function AddToCartButton({
  salesMode,
  directOrdersEnabled,
  price,
  productSlug,
  partNumber,
  name,
  qty = 1,
  size = "md",
  iconOnly = false,
  className,
}: {
  salesMode: SalesMode;
  /** Bootstrap `directOrdersEnabled`. */
  directOrdersEnabled: boolean;
  price: number | null;
  productSlug: string;
  partNumber: string;
  name: string;
  qty?: number;
  size?: ButtonSize;
  /** 44px square for dense phone rows (accessible name stays the full label). */
  iconOnly?: boolean;
  className?: string;
}) {
  const t = useTranslations("ui");
  const [added, setAdded] = useState(false);
  if (!isDirect({ salesMode, price }, directOrdersEnabled) || price === null) return null;
  return (
    <button
      type="button"
      aria-label={`${added ? t("addedToCart") : t("addToCart")}, ${partNumber || name}`}
      onClick={() => {
        addToCart({ productSlug, partNumber, name, unitPrice: price, qty });
        setAdded(true);
        announce(`${t("addedToCart")}: ${partNumber || name}`);
        setTimeout(() => setAdded(false), 1600);
      }}
      title={iconOnly ? (added ? t("addedToCart") : t("addToCart")) : undefined}
      className={buttonClass({ variant: "secondary", size: iconOnly ? "icon" : size }, className)}
    >
      {added ? <Check aria-hidden className="animate-re-tick" /> : <ShoppingCart aria-hidden strokeWidth={1.75} />}
      {!iconOnly && <span>{added ? t("addedToCart") : t("addToCart")}</span>}
    </button>
  );
}
