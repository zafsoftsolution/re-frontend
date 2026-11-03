"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

interface Props {
  item: CartItem;
  variant?: "drawer" | "page";
  onNavigate?: () => void;
}

export default function CartLineItem({ item, variant = "drawer", onNavigate }: Props) {
  const { updateQuantity, removeFromCart } = useCart();
  const isPage = variant === "page";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${isPage ? "py-6 border-b border-navy/10" : "py-5"}`}
    >
      <Link
        href={`/products/${item.product.slug}`}
        onClick={onNavigate}
        className={`relative shrink-0 overflow-hidden bg-bone ${
          isPage ? "h-32 w-24 md:h-40 md:w-32" : "h-28 w-20"
        }`}
      >
        <Image
          src={item.product.images[0]}
          alt={item.product.name}
          fill
          sizes="120px"
          className="object-cover hover:scale-[1.04] transition-transform duration-700"
        />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${item.product.slug}`}
              onClick={onNavigate}
              className="font-display text-sm md:text-base text-navy hover:text-gold transition-colors line-clamp-2"
            >
              {item.product.name}
            </Link>
            <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mt-1 truncate">
              {item.product.category}
            </p>
          </div>
          <button
            onClick={() => removeFromCart(item.id)}
            aria-label="Remove"
            className="h-8 w-8 grid place-items-center rounded-full hover:bg-navy/5 text-ink/60 hover:text-navy transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-[0.15em] uppercase text-ink/65">
          {item.selectedSize && item.selectedSize !== "ONE" && (
            <span className="flex items-center gap-1.5">
              <span className="text-ink/40">Size</span>
              <span className="text-navy">{item.selectedSize}</span>
            </span>
          )}
          {item.selectedColor && (
            <span className="flex items-center gap-1.5">
              <span className="text-ink/40">Color</span>
              <span className="text-navy">{item.selectedColor}</span>
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            onChange={(q) => updateQuantity(item.id, q)}
          />
          <div className="text-right">
            <p className="font-display text-base text-navy tabular">
              {formatPrice(item.product.price * item.quantity)}
            </p>
            {item.quantity > 1 && (
              <p className="text-[11px] text-ink/50 tabular">
                {formatPrice(item.product.price)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="inline-flex items-center border border-navy/15 rounded-full">
      <button
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className="h-9 w-9 grid place-items-center hover:bg-navy/5 rounded-l-full text-navy disabled:opacity-30"
        disabled={value <= 1}
      >
        <Minus size={12} />
      </button>
      <span className="min-w-8 text-center text-sm tabular text-navy">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="h-9 w-9 grid place-items-center hover:bg-navy/5 rounded-r-full text-navy"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
