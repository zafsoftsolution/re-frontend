"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, ShoppingBag, Trash2, X, ArrowUpRight } from "lucide-react";
import type { Product } from "@/types";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import ProductCard from "@/components/catalog/ProductCard";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  recommended: Product[];
}

export default function WishlistView({ recommended }: Props) {
  const { items, removeFromWishlist, clear, count } = useWishlist();
  const { addToCart } = useCart();

  function addAllToCart() {
    for (const p of items) {
      const firstSize =
        p.sizes.find((s) => s.inStock)?.label ?? p.sizes[0]?.label ?? "ONE";
      const firstColor = p.colors[0]?.name ?? "";
      addToCart({ product: p, size: firstSize, color: firstColor });
    }
  }

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6"
        >
          /Wishlist · {count === 0 ? "Empty" : `${String(count).padStart(2, "0")} saved`}
        </motion.p>

        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end">
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: EASE }}
              className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy"
            >
              {count === 0 ? (
                <>
                  Nothing <span className="italic">saved</span> — yet.
                </>
              ) : (
                <>
                  Saved for <span className="italic">later.</span>
                </>
              )}
            </motion.h1>
          </div>

          {count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3"
            >
              <button onClick={addAllToCart} className="btn-primary">
                <ShoppingBag size={14} />
                Add all to bag
              </button>
              <button
                onClick={clear}
                className="btn-ghost text-navy border-navy/30 hover:border-navy"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            </motion.div>
          )}
        </div>
      </header>

      {count === 0 ? (
        <EmptyState />
      ) : (
        <section className="shell pb-24 md:pb-32">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14 md:gap-x-6 md:gap-y-20">
            <AnimatePresence initial={false}>
              {items.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.6, delay: (i % 4) * 0.05, ease: EASE }}
                  className="relative"
                >
                  <WishlistCard
                    product={product}
                    onRemove={() => removeFromWishlist(product.id)}
                    onAddToCart={() => {
                      const size =
                        product.sizes.find((s) => s.inStock)?.label ??
                        product.sizes[0]?.label ??
                        "ONE";
                      const color = product.colors[0]?.name ?? "";
                      addToCart({ product, size, color });
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {recommended.length > 0 && count > 0 && (
        <Recommendations products={recommended} />
      )}
    </>
  );
}

function WishlistCard({
  product,
  onRemove,
  onAddToCart,
}: {
  product: Product;
  onRemove: () => void;
  onAddToCart: () => void;
}) {
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const oos = !product.sizes.some((s) => s.inStock);

  return (
    <article className="group">
      <div className="relative aspect-portrait overflow-hidden bg-bone">
        <Link href={`/products/${product.slug}`} className="block absolute inset-0">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            />
          )}
        </Link>

        <button
          onClick={onRemove}
          aria-label="Remove from wishlist"
          className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-cream/85 backdrop-blur hover:bg-red-500 hover:text-cream transition-colors"
        >
          <X size={15} />
        </button>

        {oos && (
          <span className="absolute top-3 left-3 bg-ink/90 text-cream text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
            Sold out
          </span>
        )}
        {onSale && !oos && (
          <span className="absolute top-3 left-3 bg-navy text-cream text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
            Sale
          </span>
        )}

        {!oos && (
          <button
            onClick={onAddToCart}
            className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-navy/95 backdrop-blur text-cream text-[11px] tracking-[0.2em] uppercase py-3 flex items-center justify-center gap-2 hover:text-gold"
          >
            <ShoppingBag size={14} /> Move to bag
          </button>
        )}
      </div>

      <Link href={`/products/${product.slug}`} className="block mt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base md:text-lg text-navy truncate hover:text-gold transition-colors">
              {product.name}
            </h3>
            <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mt-1 truncate">
              {product.category}
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
    </article>
  );
}

function EmptyState() {
  return (
    <section className="shell pb-24">
      <div className="border border-navy/10 bg-cream px-6 py-16 md:py-24 grid place-items-center text-center">
        <div className="h-16 w-16 grid place-items-center rounded-full border border-navy/15 text-navy/50 mb-6">
          <Heart size={22} />
        </div>
        <h2 className="font-display text-3xl md:text-4xl text-navy tracking-tight">
          Tap the heart to <span className="italic">save</span>.
        </h2>
        <p className="mt-4 max-w-md text-ink/60">
          Everything you save lives here — wearable, alterable, buyable. Build your own quiet edit.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/products" className="btn-primary">
            Browse the house
          </Link>
          <Link href="/lookbook" className="btn-ghost text-navy border-navy/30 hover:border-navy">
            <span>Explore lookbook</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Recommendations({ products }: { products: Product[] }) {
  return (
    <section className="bg-bone py-20 md:py-28">
      <div className="shell">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
              /Might also love
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-navy tracking-tight">
              More to <span className="italic">save</span>.
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden md:inline-flex items-center gap-2 link-swipe text-navy text-[11px] tracking-[0.3em] uppercase"
          >
            All products <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-6 md:gap-y-16">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
