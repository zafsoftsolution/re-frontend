"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { siteConfig } from "@/config/site";
import type { HomeBlock } from "@/lib/storefront";

interface Props {
  block?: HomeBlock | null;
}

/**
 * Outer gate. Without this split, calling `useScroll({ target: ref })` and
 * THEN returning null when `block` is missing leaves framer-motion with a
 * ref that never attaches — which throws "Target ref is defined but not
 * hydrated" on hydration.
 */
export default function ManifestoSplit({ block }: Props = {}) {
  if (!block) return null;
  return <ManifestoSplitInner block={block} />;
}

function ManifestoSplitInner({ block }: { block: HomeBlock }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-80, 80]);

  const imageSrc = block.image || "";
  const eyebrow = block.eyebrow || "";
  const ctaLabel = block.ctaLabel || "";
  const ctaHref = block.ctaHref || "";
  const paragraphs = block.body
    ? block.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <section ref={ref} className="relative py-24 md:py-40 overflow-hidden">
      <div className="shell grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {imageSrc && (
          <motion.div style={{ y }} className="relative aspect-[4/5] max-w-lg mx-auto w-full">
            <Image
              src={imageSrc}
              alt={block.title || siteConfig.name}
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
              unoptimized
            />
            <span className="absolute -bottom-3 -right-3 bg-gold text-navy px-4 py-2 text-[10px] tracking-[0.3em] uppercase font-semibold">
              Est. {siteConfig.brand.founded}
            </span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow && (
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
              {eyebrow}
            </p>
          )}
          {(block.title || block.subtitle) && (
            <h2 className="font-display text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-navy tracking-tight">
              {block.title}
              {block.subtitle && <> <span className="italic">{block.subtitle}</span></>}
            </h2>
          )}

          {paragraphs.length > 0 && (
            <div className="mt-10 space-y-5 text-ink/75 leading-relaxed max-w-md">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}

          {(ctaLabel && ctaHref) && (
            <div className="mt-10 flex items-center gap-4">
              <Link href={ctaHref} className="btn-primary">
                {ctaLabel}
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
