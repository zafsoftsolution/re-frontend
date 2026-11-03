"use client";

import type { HomeBlock } from "@/lib/storefront";

interface Props {
  blocks?: HomeBlock[];
}

export default function Marquee({ blocks }: Props = {}) {
  const words: string[] = [];
  for (const b of blocks ?? []) {
    if (b.body) {
      words.push(...b.body.split(/[·•|\n]+/).map((s) => s.trim()).filter(Boolean));
    } else if (b.title) {
      words.push(b.title);
    }
  }
  // Fully admin-driven: no marquee blocks → no marquee on the page.
  if (words.length === 0) return null;

  return (
    <section aria-hidden className="bg-navy text-cream border-y border-gold/20 py-6 overflow-hidden">
      <div className="marquee-track">
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="flex items-center gap-10 px-5 font-display text-3xl md:text-5xl whitespace-nowrap">
            {words.map((w, i) => (
              <span key={i} className="flex items-center gap-10">
                <span className={i % 2 === 0 ? "italic text-gold" : "text-cream/90"}>{w}</span>
                <span className="text-gold/60">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
