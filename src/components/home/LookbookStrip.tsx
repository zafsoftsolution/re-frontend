"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Play } from "lucide-react";
import type { HomeBlock } from "@/lib/storefront";
import type { LookbookEntry } from "@/types";

interface Props {
  lookbooks?: LookbookEntry[];
  block?: HomeBlock | null;
}

interface Slide {
  src: string;
  href: string;
  label: string;
}

/**
 * Outer gate. Decides whether to render at all so the inner component's
 * `useScroll` hook only runs when the ref will actually attach to DOM.
 * Without this split, framer-motion throws "Target ref is defined but not
 * hydrated" when slides is empty and we return null after calling useScroll.
 */
export default function LookbookStrip({ lookbooks, block }: Props = {}) {
  const looks = (lookbooks ?? []).slice(0, 3);
  const slides: Slide[] = [];
  for (const l of looks) {
    const cover = l.coverImage || l.images[0];
    if (!cover) continue;
    slides.push({
      src: cover,
      href: `/lookbook/${l.slug}`,
      label: l.title,
    });
  }
  // Fill out to 3 slides for the visual rhythm by repeating the last one.
  while (slides.length > 0 && slides.length < 3) {
    slides.push(slides[slides.length - 1]);
  }
  if (slides.length === 0) return null;

  return <LookbookStripInner slides={slides} firstLook={looks[0]} block={block} />;
}

function LookbookStripInner({
  slides,
  firstLook,
  block,
}: {
  slides: Slide[];
  firstLook?: LookbookEntry;
  block?: HomeBlock | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  const eyebrow = block?.eyebrow || "";
  const title = block?.title;
  const subtitle = block?.subtitle;
  const fullLookbookHref =
    block?.ctaHref || (firstLook ? `/lookbook/${firstLook.slug}` : "/lookbook");

  return (
    <section ref={ref} className="relative py-24 md:py-32 overflow-hidden bg-cream">
      <div className="shell flex items-end justify-between mb-10 md:mb-14">
        <div>
          {eyebrow && (
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
              {eyebrow}
            </p>
          )}
          {(title || subtitle) && (
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] text-navy tracking-tight">
              {title}
              {subtitle && <> <span className="italic">{subtitle}</span></>}
            </h2>
          )}
        </div>
        {(block?.ctaLabel || fullLookbookHref) && (
          <Link
            href={fullLookbookHref}
            className="hidden md:inline-flex items-center gap-2 link-swipe text-navy"
          >
            <span className="text-[11px] tracking-[0.3em] uppercase">
              {block?.ctaLabel || "View full lookbook"}
            </span>
          </Link>
        )}
      </div>

      <motion.div style={{ x }} className="flex gap-5 md:gap-8 pl-6 md:pl-14">
        {slides.map((slide, i) => (
          <Link
            key={`${slide.src}-${i}`}
            href={slide.href}
            className={`relative shrink-0 overflow-hidden group ${
              i === 1 ? "aspect-[3/4] w-[55vw] md:w-[38vw]" : "aspect-banner w-[80vw] md:w-[52vw]"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.label}
              fill
              sizes="60vw"
              className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
              unoptimized
            />
            <div className="absolute inset-0 bg-navy/10 transition-colors group-hover:bg-navy/20" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-cream text-[10px] tracking-[0.3em] uppercase">
              <span className="truncate max-w-[60%]">{slide.label}</span>
              <span
                aria-label="View look"
                className="h-10 w-10 grid place-items-center rounded-full bg-cream/15 backdrop-blur border border-cream/30 group-hover:bg-gold group-hover:text-navy transition-colors"
              >
                <Play size={14} />
              </span>
            </div>
          </Link>
        ))}
      </motion.div>
    </section>
  );
}
