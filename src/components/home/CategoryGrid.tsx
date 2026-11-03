"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { HomeBlock } from "@/lib/storefront";
import type { Category } from "@/types";

interface Props {
  categories?: Category[];
  block?: HomeBlock | null;
}

export default function CategoryGrid({ categories, block }: Props = {}) {
  const cats = categories ?? [];
  // No featured categories from the backend → don't render the section.
  if (cats.length === 0) return null;

  const eyebrow = block?.eyebrow || "";
  const ctaLabel = block?.ctaLabel || "All categories";
  const ctaHref = block?.ctaHref || "/categories";

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
        <Link
          href={ctaHref}
          className="hidden md:flex items-center gap-2 link-swipe text-navy"
        >
          <span className="text-[11px] tracking-[0.3em] uppercase">{ctaLabel}</span>
          <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {cats.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/categories/${cat.slug}`}
              className="group relative block aspect-portrait overflow-hidden bg-bone"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 text-cream flex items-end justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1.5">
                    {cat.productCount} pieces
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl">{cat.name}</h3>
                </div>
                <div className="h-9 w-9 grid place-items-center rounded-full border border-cream/40 group-hover:bg-gold group-hover:border-gold group-hover:text-navy transition-all duration-500">
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
