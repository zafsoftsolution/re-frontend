"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { addToCart } from "@/lib/stores/cart";
import type { SalesMode } from "@/lib/api/types";
import { buttonClass, type ButtonSize } from "./button-styles";

/**
 * Only for direct-sale parts. Renders nothing for quote-only parts so callers
 * can drop it in unconditionally: <AddToCartButton salesMode={p.salesMode} … />
 */
export function AddToCartButton({
  salesMode,
  price,
  productSlug,
  partNumber,
  name,
  qty = 1,
  size = "md",
  className,
}: {
  salesMode: SalesMode;
  price: number | null;
  productSlug: string;
  partNumber: string;
  name: string;
  qty?: number;
  size?: ButtonSize;
  className?: string;
}) {
  const t = useTranslations("ui");
  const [added, setAdded] = useState(false);
  if (salesMode !== "direct" || price === null) return null;
  return (
    <button
      type="button"
      onClick={() => {
        addToCart({ productSlug, partNumber, name, unitPrice: price, qty });
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className={buttonClass({ variant: "secondary", size }, className)}
    >
      {added ? <Check aria-hidden className="animate-re-tick" /> : <ShoppingCart aria-hidden strokeWidth={1.75} />}
      <span>{added ? t("addedToCart") : t("addToCart")}</span>
    </button>
  );
}
