"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { HomeBlock } from "@/lib/storefront";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  block?: HomeBlock;
}

/**
 * The hero is the one section we never let render empty — without an
 * above-the-fold image the page looks broken. If the admin hasn't published
 * a hero block, we fall back to a minimal navy-on-cream brand card.
 * Everything else on the homepage is fully admin-driven.
 */
export default function Hero({ block }: Props = {}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  const imageSrc = block?.image || "";
  const eyebrow = block?.eyebrow || "";
  const ctaLabel = block?.ctaLabel || "Shop now";
  const ctaHref = block?.ctaHref || "/products";
  const subtitle = block?.subtitle || "";
  // Optional secondary headline shown in the hero's top-right corner. Admin
  // can set it via the block's `metadata.top_right` key.
  const topRightMeta =
    typeof block?.metadata?.top_right === "string"
      ? (block.metadata.top_right as string)
      : null;

  return (
    <section ref={ref} className="relative h-[100svh] w-full overflow-hidden grain">
      <motion.div style={{ scale, y }} className="absolute inset-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={block?.title || siteConfig.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          // No hero image set in admin — render a navy brand card so the page
          // never lands with a broken-looking blank hero.
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy/85" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/20 via-navy/10 to-navy/70" />
      </motion.div>

      <motion.div style={{ opacity }} className="relative z-10 h-full shell flex flex-col">
        {/* Top meta */}
        <div className="pt-6 flex items-center justify-between text-cream/80 text-[11px] tracking-[0.3em] uppercase">
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {eyebrow}
            </motion.span>
          )}
          {topRightMeta && (
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="hidden md:block"
            >
              {topRightMeta}
            </motion.span>
          )}
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-end pb-20 md:pb-28">
          <h1 className="text-cream">
            <MaskLine delay={0.2}>
              <span className="font-display text-[clamp(4rem,14vw,12rem)] leading-[0.9] tracking-tight">
                {block?.title || siteConfig.name}
              </span>
            </MaskLine>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
            className="mt-10 md:mt-14 flex flex-col md:flex-row gap-6 md:items-end md:justify-between"
          >
            {(subtitle || !block) && (
              <p className="max-w-md text-cream/80 text-base leading-relaxed">
                {subtitle || siteConfig.tagline}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Link href={ctaHref} className="btn-primary">
                {ctaLabel}
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/lookbook"
                className="btn-ghost text-cream border-cream/40 hover:border-cream"
              >
                <span>Lookbook</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 text-cream/60 text-[10px] tracking-[0.3em] uppercase z-10 flex flex-col items-center gap-2"
      >
        <span>Scroll</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-6 w-px bg-gold"
        />
      </motion.div>
    </section>
  );
}

function MaskLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.1, delay, ease: EASE }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}
