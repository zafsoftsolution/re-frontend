"use client";

import Image from "next/image";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import type { HomeBlockKind } from "@/lib/django-admin";

/**
 * Mini representations of each homepage block kind. Drives the live preview
 * pane in `HomeBlockEditor` so the owner can see what their changes look like
 * on the public storefront before saving.
 *
 * Each preview deliberately mirrors the look-and-feel of the real component
 * (Hero / Marquee / FeaturedEdit / ManifestoSplit / NewsletterClosing) but at
 * a reduced scale that fits inside the editor drawer.
 */

export interface HomeBlockDraft {
  kind: HomeBlockKind;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  image?: string;
  secondary_image?: string;
  cta_label?: string;
  cta_href?: string;
  text_color?: string;
}

export default function HomeBlockPreview({ block }: { block: HomeBlockDraft }) {
  switch (block.kind) {
    case "hero":
      return <HeroPreview block={block} />;
    case "marquee":
      return <MarqueePreview block={block} />;
    case "category_grid":
      return (
        <SectionHeaderPreview
          block={block}
          defaultEyebrow="/02 · Categories"
          defaultTitle="Shop by silhouette."
          tileLabel="Category"
          tileShape="aspect-[3/4]"
          showCta
        />
      );
    case "featured_edit":
      return <FeaturedEditPreview block={block} />;
    case "manifesto":
      return <ManifestoPreview block={block} />;
    case "new_arrivals":
      return (
        <SectionHeaderPreview
          block={block}
          defaultEyebrow="/05 · New In"
          defaultTitle="Arrived this week."
          tileLabel="New product"
          tileShape="aspect-[3/4]"
          dark
        />
      );
    case "lookbook_feature":
      return <LookbookPreview block={block} />;
    case "best_sellers":
      return (
        <SectionHeaderPreview
          block={block}
          defaultEyebrow="/07 · House Best Sellers"
          defaultTitle="Pieces our clients return for."
          tileLabel="Best seller"
          tileShape="aspect-[3/4]"
        />
      );
    case "testimonials":
      return (
        <TestimonialHeaderPreview block={block} />
      );
    case "newsletter_cta":
      return <NewsletterPreview block={block} />;
    case "custom":
    default:
      return <CustomPreview block={block} />;
  }
}

// ─── Per-kind previews ─────────────────────────────────────────────────────

function HeroPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="relative aspect-[4/5] sm:aspect-[16/10] w-full overflow-hidden bg-navy text-cream rounded-md">
      {block.image ? (
        <Image
          src={block.image}
          alt=""
          fill
          sizes="600px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-cream/40 text-xs tracking-[0.3em] uppercase">
          No image yet
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-navy/10 to-navy/80" />
      <div className="relative h-full flex flex-col justify-between p-5">
        <p
          className="text-[10px] tracking-[0.3em] uppercase opacity-90"
          style={block.text_color ? { color: block.text_color } : undefined}
        >
          {block.eyebrow || "Spring/Summer 26"}
        </p>
        <div>
          <h2
            className="font-display text-3xl sm:text-5xl leading-[0.95] tracking-tight max-w-md"
            style={block.text_color ? { color: block.text_color } : undefined}
          >
            {block.title || "Tailored for the rising."}
          </h2>
          {(block.subtitle || block.body) && (
            <p className="mt-3 text-xs sm:text-sm text-cream/75 max-w-sm leading-relaxed line-clamp-3">
              {block.subtitle || block.body}
            </p>
          )}
          {block.cta_label && (
            <span className="mt-4 inline-flex items-center gap-2 bg-cream text-navy px-4 py-2 text-[10px] tracking-[0.2em] uppercase">
              {block.cta_label} <ArrowRight size={12} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MarqueePreview({ block }: { block: HomeBlockDraft }) {
  const words = (block.body || block.title || "")
    .split(/[·•|\n]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const fallback = ["Ready-to-Wear", "Atelier-Crafted", "SS26"];
  const items = words.length > 0 ? words : fallback;
  return (
    <div className="bg-navy text-cream border-y border-gold/30 py-4 overflow-hidden rounded-md">
      <div className="flex items-center gap-6 whitespace-nowrap font-display text-xl sm:text-2xl px-4">
        {items.map((w, i) => (
          <span key={i} className="flex items-center gap-6">
            <span className={i % 2 === 0 ? "italic text-gold" : "text-cream/90"}>{w}</span>
            <span className="text-gold/60">✦</span>
          </span>
        ))}
        {/* duplicated for marquee feel */}
        {items.map((w, i) => (
          <span key={`b-${i}`} className="flex items-center gap-6 opacity-60">
            <span className={i % 2 === 0 ? "italic text-gold" : "text-cream/90"}>{w}</span>
            <span className="text-gold/60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FeaturedEditPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="bg-bone p-5 rounded-md">
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold">
        {block.eyebrow || "/03 · The Edit"}
      </p>
      <h2 className="font-display text-3xl sm:text-4xl text-navy tracking-tight mt-3">
        {block.title || "A considered few."}
      </h2>
      {(block.subtitle || block.body) && (
        <p className="text-sm text-ink/65 leading-relaxed max-w-md mt-3 line-clamp-3">
          {block.subtitle || block.body}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-[3/4] bg-cream rounded relative overflow-hidden"
          >
            {block.image && i === 0 ? (
              <Image src={block.image} alt="" fill className="object-cover" sizes="200px" unoptimized />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-ink/30 text-[10px] tracking-[0.2em] uppercase">
                Product
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ManifestoPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-5 rounded-md bg-white border border-[var(--jmn-line)]">
      <div className="relative aspect-[4/5] bg-bone overflow-hidden rounded">
        {block.image ? (
          <Image src={block.image} alt="" fill className="object-cover" sizes="220px" unoptimized />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink/30 text-[10px] tracking-[0.2em] uppercase">
            Atelier
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold">
          {block.eyebrow || "/04 · The House"}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-navy leading-tight tracking-tight mt-3">
          {block.title || "Slow to design."}
        </h2>
        {block.body && (
          <p className="text-xs text-ink/65 leading-relaxed mt-3 line-clamp-5 whitespace-pre-line">
            {block.body}
          </p>
        )}
        {block.cta_label && (
          <span className="mt-3 inline-flex items-center gap-2 bg-navy text-cream px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase">
            {block.cta_label}
          </span>
        )}
      </div>
    </div>
  );
}

function LookbookPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="bg-cream p-5 rounded-md">
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold">
        {block.eyebrow || "/06 · Lookbook"}
      </p>
      <h2 className="font-display text-3xl text-navy tracking-tight mt-3">
        {block.title || "Featured shoot"}
      </h2>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="relative aspect-[3/4] bg-bone rounded overflow-hidden">
          {block.image ? (
            <Image src={block.image} alt="" fill className="object-cover" sizes="200px" unoptimized />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-ink/30 text-[10px] uppercase tracking-[0.2em]">
              Cover
            </div>
          )}
        </div>
        <div className="relative aspect-[3/4] bg-bone rounded overflow-hidden">
          {block.secondary_image ? (
            <Image src={block.secondary_image} alt="" fill className="object-cover" sizes="200px" unoptimized />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-ink/30 text-[10px] uppercase tracking-[0.2em]">
              Spread
            </div>
          )}
        </div>
      </div>
      {(block.subtitle || block.body) && (
        <p className="text-xs text-ink/65 leading-relaxed mt-3 line-clamp-2">
          {block.subtitle || block.body}
        </p>
      )}
    </div>
  );
}

function NewsletterPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="relative bg-navy text-cream rounded-md py-10 px-6 text-center overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_120%,rgba(201,161,74,0.3),transparent_60%)]"
      />
      <div className="relative">
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-4">
          {block.eyebrow || "/10 · Private List"}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
          {block.title || "Early access."}
          {block.subtitle && (
            <>
              <br />
              <span className="italic text-gold">{block.subtitle}</span>
            </>
          )}
        </h2>
        <p className="mt-4 text-cream/70 text-xs max-w-sm mx-auto leading-relaxed line-clamp-3">
          {block.body ||
            "Join the house list for first access to new collections and private invites."}
        </p>
        <div className="mt-5 max-w-sm mx-auto border-b border-cream/30 flex items-center">
          <span className="flex-1 py-2 text-cream/40 text-sm text-left">
            <Mail size={14} className="inline mr-2" />
            your@email.com
          </span>
          <span className="h-8 w-8 grid place-items-center rounded-full bg-cream/10 text-cream">
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeaderPreview({
  block,
  defaultEyebrow,
  defaultTitle,
  tileLabel,
  tileShape,
  dark = false,
  showCta = false,
}: {
  block: HomeBlockDraft;
  defaultEyebrow: string;
  defaultTitle: string;
  tileLabel: string;
  tileShape: string;
  dark?: boolean;
  showCta?: boolean;
}) {
  const goldEyebrow = "text-[10px] tracking-[0.3em] uppercase text-gold";
  const titleClass = dark
    ? "font-display text-2xl sm:text-3xl tracking-tight text-cream"
    : "font-display text-2xl sm:text-3xl tracking-tight text-navy";
  const wrap = dark ? "bg-navy text-cream rounded-md p-5" : "bg-white border border-[var(--jmn-line)] rounded-md p-5";
  return (
    <div className={wrap}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={goldEyebrow}>{block.eyebrow || defaultEyebrow}</p>
          <h2 className={`${titleClass} mt-2`}>{block.title || defaultTitle}</h2>
          {block.subtitle && (
            <p className={`text-xs mt-2 max-w-md leading-relaxed ${dark ? "text-cream/65" : "text-ink/65"}`}>
              {block.subtitle}
            </p>
          )}
        </div>
        {(showCta && block.cta_label) && (
          <span className={`text-[10px] tracking-[0.3em] uppercase shrink-0 hidden sm:inline-flex items-center gap-2 ${dark ? "text-cream/80" : "text-navy"}`}>
            {block.cta_label}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`${tileShape} rounded relative overflow-hidden ${dark ? "bg-navy-soft" : "bg-bone"}`}
          >
            {block.image && i === 0 ? (
              <Image src={block.image} alt="" fill className="object-cover" sizes="200px" unoptimized />
            ) : (
              <div className={`absolute inset-0 grid place-items-center text-[10px] tracking-[0.2em] uppercase ${dark ? "text-cream/35" : "text-ink/30"}`}>
                {tileLabel}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialHeaderPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="bg-bone p-6 rounded-md text-center">
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        {block.eyebrow || "/08 · From the House"}
      </p>
      <div className="flex justify-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="text-gold">★</span>
        ))}
      </div>
      <p className="font-display text-xl sm:text-2xl text-navy leading-snug max-w-md mx-auto">
        &ldquo;{block.title || "An exceptional standard of finish — unlike anything else in my wardrobe."}&rdquo;
      </p>
      {block.subtitle && (
        <p className="text-xs text-ink/65 mt-3 max-w-md mx-auto">{block.subtitle}</p>
      )}
      <div className="mt-5 flex items-center justify-center gap-3">
        <div className="h-10 w-10 rounded-full bg-cream/40" />
        <div className="text-left">
          <p className="text-sm text-navy">— Author name</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink/55">Role / Location</p>
        </div>
      </div>
    </div>
  );
}

function CustomPreview({ block }: { block: HomeBlockDraft }) {
  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-md p-5">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        <Sparkles size={12} /> {block.eyebrow || "Custom block"}
      </div>
      {block.title && (
        <h2 className="font-display text-2xl text-navy tracking-tight">{block.title}</h2>
      )}
      {block.subtitle && (
        <p className="text-sm text-ink/70 mt-2">{block.subtitle}</p>
      )}
      {block.image && (
        <div className="relative aspect-[16/9] mt-3 rounded overflow-hidden bg-bone">
          <Image src={block.image} alt="" fill className="object-cover" sizes="400px" unoptimized />
        </div>
      )}
      {block.body && (
        <p className="text-sm text-ink/70 mt-3 leading-relaxed whitespace-pre-line line-clamp-6">
          {block.body}
        </p>
      )}
      {block.cta_label && (
        <span className="mt-3 inline-flex items-center gap-2 bg-navy text-cream px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase">
          {block.cta_label}
        </span>
      )}
    </div>
  );
}
