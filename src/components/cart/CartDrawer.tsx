"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { ShoppingBag, X, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useTranslate } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/utils";
import CartLineItem from "./CartLineItem";
import FreeShippingProgress from "./FreeShippingProgress";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    close,
    subtotal,
    freeShippingRemaining,
    freeShippingThreshold,
    hasFreeShipping,
    count,
  } = useCart();
  const t = useTranslate();

  // Body scroll lock while open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            className="fixed inset-0 bg-navy/55 backdrop-blur-sm z-[70]"
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 w-full sm:max-w-lg bg-cream z-[71] flex flex-col shadow-2xl shadow-navy/20"
            role="dialog"
            aria-label="Shopping bag"
            data-lenis-prevent
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-navy/10">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-navy" />
                <h2 className="font-display text-xl text-navy">
                  {t("cart.title")}
                  {count > 0 && (
                    <span className="ml-2 text-[11px] tracking-[0.25em] uppercase text-gold tabular">
                      · {count}
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={close}
                aria-label={t("common.close")}
                className="h-10 w-10 grid place-items-center rounded-full hover:bg-navy/5 text-navy transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Free shipping banner */}
            {items.length > 0 && (
              <FreeShippingProgress
                subtotal={subtotal}
                threshold={freeShippingThreshold}
                remaining={freeShippingRemaining}
                hasFreeShipping={hasFreeShipping}
              />
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {items.length === 0 ? <EmptyState onClose={close} /> : (
                <ul>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <li key={item.id} className="border-b border-navy/10 last:border-b-0">
                        <CartLineItem item={item} variant="drawer" onNavigate={close} />
                      </li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-navy/10 px-6 py-5 space-y-4 bg-cream">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] tracking-[0.25em] uppercase text-ink/55">
                      {t("cart.subtotal")}
                    </p>
                    <p className="text-[10px] text-ink/40 mt-1">
                      {t("cart.shipping")} & {t("cart.tax")}
                    </p>
                  </div>
                  <p className="font-display text-2xl text-navy tabular">
                    {formatPrice(subtotal)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href="/checkout"
                    onClick={close}
                    className="btn-primary w-full justify-center"
                  >
                    {t("cart.checkout")}
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/cart"
                    onClick={close}
                    className="text-center text-[11px] tracking-[0.25em] uppercase text-navy py-2 link-swipe inline-block mx-auto"
                  >
                    {t("cart.view_bag")}
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  const t = useTranslate();
  return (
    <div className="flex flex-col items-center text-center py-20">
      <div className="h-16 w-16 grid place-items-center rounded-full border border-navy/15 text-navy/40 mb-6">
        <ShoppingBag size={22} />
      </div>
      <h3 className="font-display text-3xl text-navy tracking-tight">
        {t("cart.empty_title")}
      </h3>
      <p className="mt-3 text-sm text-ink/60 max-w-xs">
        {t("cart.empty_blurb")}
      </p>
      <Link
        href="/products"
        onClick={onClose}
        className="btn-primary mt-8"
      >
        {t("common.shop_now")}
      </Link>
    </div>
  );
}
