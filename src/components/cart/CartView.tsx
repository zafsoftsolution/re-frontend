"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import CartLineItem from "./CartLineItem";
import FreeShippingProgress from "./FreeShippingProgress";
import OrderSummary from "./OrderSummary";
import ProductCard from "@/components/catalog/ProductCard";

interface Props {
  recommended: Product[];
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CartView({ recommended }: Props) {
  const {
    items,
    subtotal,
    freeShippingRemaining,
    freeShippingThreshold,
    hasFreeShipping,
    count,
    clearCart,
  } = useCart();

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6"
        >
          /Your bag · {count === 0 ? "Empty" : `${String(count).padStart(2, "0")} items`}
        </motion.p>
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: EASE }}
            className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy"
          >
            {items.length === 0 ? (
              <>
                Your bag <span className="italic">waits.</span>
              </>
            ) : (
              <>
                The <span className="italic">edit</span>.
              </>
            )}
          </motion.h1>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState recommended={recommended} />
      ) : (
        <>
          <div className="shell pb-24 md:pb-32">
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-16">
              <div>
                <FreeShippingProgress
                  subtotal={subtotal}
                  threshold={freeShippingThreshold}
                  remaining={freeShippingRemaining}
                  hasFreeShipping={hasFreeShipping}
                />
                <ul className="mt-2">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <li key={item.id}>
                        <CartLineItem item={item} variant="page" />
                      </li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={clearCart}
                    className="text-[11px] tracking-[0.25em] uppercase text-ink/55 hover:text-navy transition-colors underline underline-offset-4"
                  >
                    Clear bag
                  </button>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-navy link-swipe"
                  >
                    Continue shopping <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>

              <OrderSummary />
            </div>
          </div>

          {recommended.length > 0 && (
            <Recommendations products={recommended} heading="Might pair well" />
          )}
        </>
      )}
    </>
  );
}

function EmptyState({ recommended }: { recommended: Product[] }) {
  return (
    <>
      <section className="shell pb-24">
        <div className="border border-navy/10 bg-cream px-6 py-16 md:py-24 grid place-items-center text-center">
          <div className="h-16 w-16 grid place-items-center rounded-full border border-navy/15 text-navy/50 mb-6">
            <ShoppingBag size={22} />
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-navy tracking-tight">
            Nothing in the bag <span className="italic">— yet.</span>
          </h2>
          <p className="mt-4 text-ink/60 max-w-md">
            Browse the house and fill it with pieces worth keeping.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="btn-primary">
              Shop the collection
            </Link>
            <Link href="/collections" className="btn-ghost text-navy border-navy/30 hover:border-navy">
              <span>Explore collections</span>
            </Link>
          </div>
        </div>
      </section>
      {recommended.length > 0 && (
        <Recommendations products={recommended} heading="House picks" />
      )}
    </>
  );
}

function Recommendations({
  products,
  heading,
}: {
  products: Product[];
  heading: string;
}) {
  return (
    <section className="bg-bone py-20 md:py-28">
      <div className="shell">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
              /Curated for you
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-navy tracking-tight">
              {heading}.
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
