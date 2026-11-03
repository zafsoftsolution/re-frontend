"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { HomeBlock } from "@/lib/storefront";
import type { Product } from "@/types";

interface Props {
  products?: Product[];
  block?: HomeBlock | null;
}

export default function NewArrivalsRail({ products, block }: Props = {}) {
  const items = products ?? [];
  // No products marked as new → don't render the rail.
  if (items.length === 0) return null;

  const eyebrow = block?.eyebrow || "";
  const railRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 440, behavior: "smooth" });
  };

  return (
    <section className="bg-navy text-cream py-24 md:py-40 overflow-hidden">
      <div className="shell flex items-end justify-between mb-14 md:mb-20">
        <div>
          {eyebrow && (
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
              {eyebrow}
            </p>
          )}
          {(block?.title || block?.subtitle) && (
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight">
              {block.title}
              {block.subtitle && <> <span className="italic text-gold">{block.subtitle}</span></>}
            </h2>
          )}
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="h-11 w-11 grid place-items-center rounded-full border border-cream/30 hover:bg-gold hover:border-gold hover:text-navy transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="h-11 w-11 grid place-items-center rounded-full border border-cream/30 hover:bg-gold hover:border-gold hover:text-navy transition-colors"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div ref={railRef} className="rail flex gap-6 md:gap-8 shell !pr-0 snap-x snap-mandatory">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: (i % 4) * 0.08 }}
            className="shrink-0 w-[70vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] snap-start"
          >
            <Link href={`/products/${p.slug}`} className="group block">
              <div className="relative aspect-editorial overflow-hidden bg-navy-soft">
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 70vw, 22vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                />
                {p.isNew && (
                  <span className="absolute top-4 left-4 bg-gold text-navy text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
                    New
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg leading-tight">{p.name}</h3>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-cream/50 mt-1">
                    {p.colors.length} {p.colors.length > 1 ? "colors" : "color"}
                  </p>
                </div>
                <p className="font-display text-base text-gold">{formatPrice(p.price)}</p>
              </div>
            </Link>
          </motion.div>
        ))}
        <div className="shrink-0 w-10" aria-hidden />
      </div>
    </section>
  );
}
