"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import type { HomeBlock } from "@/lib/storefront";
import type { Product } from "@/types";

interface Props {
  block?: HomeBlock | null;
  products?: Product[];
}

export default function FeaturedEdit({ block, products }: Props = {}) {
  const picks = (products ?? []).slice(0, 4);
  // Need a lead + at least one supporting tile for the layout to read.
  if (picks.length < 2) return null;

  const [lead, ...rest] = picks;
  const eyebrow = block?.eyebrow || "";
  const subtitle = block?.body || "";

  return (
    <section className="bg-bone py-24 md:py-40">
      <div className="shell">
        <div className="flex items-end justify-between mb-14 md:mb-20">
          <div>
            {eyebrow && (
              <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
                {eyebrow}
              </p>
            )}
            {(block?.title || block?.subtitle) && (
              <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] text-navy tracking-tight">
                {block?.title}
                {block?.subtitle && <> <span className="italic">{block.subtitle}</span></>}
              </h2>
            )}
          </div>
          {subtitle && (
            <p className="hidden md:block max-w-xs text-ink/60 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Lead product — large */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-3 lg:row-span-2"
          >
            <Link href={`/products/${lead.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                <Image
                  src={lead.images[0]}
                  alt={lead.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                />
                {lead.images[1] && (
                  <Image
                    src={lead.images[1]}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  />
                )}
                <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] uppercase bg-cream/90 px-2.5 py-1">
                  Featured
                </span>
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-ink/50 mb-1">
                    {lead.category}
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl text-navy">{lead.name}</h3>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl text-navy">{formatPrice(lead.price)}</p>
                  {lead.compareAtPrice && (
                    <p className="text-xs text-ink/50 line-through">{formatPrice(lead.compareAtPrice)}</p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Side products */}
          {rest.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2"
            >
              <Link href={`/products/${p.slug}`} className="group block">
                <div className="relative aspect-editorial overflow-hidden bg-cream">
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 40vw"
                    className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex items-start justify-between mt-4">
                  <div>
                    <h3 className="font-display text-xl text-navy">{p.name}</h3>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-ink/50 mt-1">
                      {p.material}
                    </p>
                  </div>
                  <p className="font-display text-base text-navy">{formatPrice(p.price)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
