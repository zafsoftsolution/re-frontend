"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import type { HomeBlock } from "@/lib/storefront";
import type { Testimonial } from "@/types";

interface Props {
  testimonials?: Testimonial[];
  block?: HomeBlock | null;
}

export default function TestimonialsCarousel({
  testimonials,
  block,
}: Props = {}) {
  const items = testimonials ?? [];
  const [i, setI] = useState(0);
  const total = items.length;
  const eyebrow = block?.eyebrow || "";

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setI((prev) => (prev + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  // No published testimonials → skip the section.
  if (total === 0) return null;
  const safeIndex = Math.min(i, total - 1);
  const t = items[safeIndex];

  return (
    <section className="bg-bone py-24 md:py-40 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute top-10 left-1/2 -translate-x-1/2 font-display text-[clamp(12rem,30vw,26rem)] leading-none text-navy/[0.04] select-none pointer-events-none"
      >
        &ldquo;
      </div>

      <div className="shell relative">
        {eyebrow && (
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-8 text-center">
            {eyebrow}
          </p>
        )}

        <AnimatePresence mode="wait">
          <motion.blockquote
            key={t.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="flex justify-center gap-1 mb-8">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  size={15}
                  className={idx < t.rating ? "fill-gold text-gold" : "text-ink/20"}
                />
              ))}
            </div>
            <p className="font-display text-[clamp(1.5rem,3vw,2.75rem)] leading-[1.25] text-navy tracking-tight">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-10 inline-flex items-center gap-4">
              {t.image && (
                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                  <Image src={t.image} alt={t.name} fill sizes="48px" className="object-cover" />
                </div>
              )}
              <div className="text-left">
                <p className="font-medium text-navy">{t.name}</p>
                <p className="text-xs tracking-[0.2em] uppercase text-ink/55">
                  {t.role ?? t.location}
                </p>
              </div>
            </div>
          </motion.blockquote>
        </AnimatePresence>

        <div className="mt-14 flex items-center justify-center gap-3">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Review ${idx + 1}`}
              className={`h-1.5 transition-all duration-500 ${
                idx === safeIndex ? "w-10 bg-navy" : "w-1.5 bg-navy/25"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
