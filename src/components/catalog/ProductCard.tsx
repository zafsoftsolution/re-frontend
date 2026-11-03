"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";

interface Props {
  product: Product;
  index: number;
  priority?: boolean;
}

export default function ProductCard({ product, index, priority }: Props) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Spare parts have no size/color — pass empty selectors.
    addToCart({ product, size: "" as never, color: "" });
  };

  const saved = isInWishlist(product.id);
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const oos = (product.stock ?? 0) <= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: (index % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="relative aspect-portrait overflow-hidden bg-bone">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isNew && (
              <Badge variant="gold">New</Badge>
            )}
            {onSale && <Badge variant="navy">Sale</Badge>}
            {oos && <Badge variant="ink">Sold out</Badge>}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product);
            }}
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-cream/85 backdrop-blur hover:bg-gold transition-colors"
          >
            <Heart
              size={15}
              className={saved ? "fill-navy text-navy" : "text-navy"}
              strokeWidth={2}
            />
          </button>

          {/* Quick-shop bar (appears on hover) */}
          {!oos && (
            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-navy/95 backdrop-blur text-cream flex items-center justify-between px-4 py-3 text-[11px] tracking-[0.2em] uppercase">
              <span>Quick add</span>
              <button
                onClick={onAddToCart}
                className="flex items-center gap-1.5 hover:text-gold transition-colors"
                aria-label="Add to cart"
              >
                <ShoppingBag size={14} /> <span>Add</span>
              </button>
            </div>
          )}

          {/* Fits-brands hint */}
          {product.machineBrands.length > 0 && (
            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-cream/85 backdrop-blur px-2 py-1 rounded-full text-[10px] tracking-[0.12em] uppercase text-navy">
              Fits {product.machineBrands.slice(0, 3).join(" · ")}
              {product.machineBrands.length > 3 && ` +${product.machineBrands.length - 3}`}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base md:text-lg text-navy truncate">
              {product.name}
            </h3>
            <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mt-1 truncate">
              {[product.brandName, product.partNumber || product.categoryName]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-base text-navy">
              {formatPrice(product.price)}
            </p>
            {onSale && (
              <p className="text-[11px] text-ink/50 line-through tabular">
                {formatPrice(product.compareAtPrice!)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "gold" | "navy" | "ink";
}) {
  const styles = {
    gold: "bg-gold text-navy",
    navy: "bg-navy text-cream",
    ink: "bg-ink/90 text-cream",
  };
  return (
    <span
      className={`${styles[variant]} text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold`}
    >
      {children}
    </span>
  );
}
