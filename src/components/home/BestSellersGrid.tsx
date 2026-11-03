"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/context/WishlistContext";
import type { HomeBlock } from "@/lib/storefront";
import type { Product } from "@/types";

interface Props {
  products?: Product[];
  block?: HomeBlock | null;
}

export default function BestSellersGrid({ products, block }: Props = {}) {
  const items = (products ?? []).slice(0, 6);
  // No best-sellers selected by the catalog → don't render the section.
  if (items.length === 0) return null;

  const eyebrow = block?.eyebrow || "";
  const { toggleWishlist, isInWishlist } = useWishlist();

  return (
    <section className="shell py-24 md:py-40">
      <div className="flex items-end justify-between mb-14 md:mb-20">
        <div>
          {eyebrow && (
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
              {eyebrow}
            </p>
          )}
          {(block?.title || block?.subtitle) && (
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] text-navy tracking-tight">
              {block.title}
              {block.subtitle && <> <span className="italic">{block.subtitle}</span></>}
            </h2>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-7 md:gap-y-20">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: (i % 3) * 0.08 }}
          >
            <Link href={`/products/${p.slug}`} className="group block">
              <div className="relative aspect-portrait overflow-hidden bg-bone">
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                />
                {p.images[1] && (
                  <Image
                    src={p.images[1]}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  />
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleWishlist(p);
                  }}
                  aria-label="Toggle wishlist"
                  className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-cream/80 backdrop-blur hover:bg-gold transition-colors"
                >
                  <Heart
                    size={16}
                    className={isInWishlist(p.id) ? "fill-navy text-navy" : "text-navy"}
                  />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 flex gap-1.5 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-500">
                  {p.colors.slice(0, 4).map((c) => (
                    <span
                      key={c.name}
                      title={c.name}
                      className="h-4 w-4 rounded-full border border-white/70"
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-navy truncate">{p.name}</h3>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mt-1 truncate">
                    {p.category} · {p.material}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-base text-navy">{formatPrice(p.price)}</p>
                  {p.compareAtPrice && (
                    <p className="text-[11px] text-ink/50 line-through">
                      {formatPrice(p.compareAtPrice)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
