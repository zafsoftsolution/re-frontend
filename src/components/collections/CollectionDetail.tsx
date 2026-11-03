"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowLeft, ArrowRight, Heart, Play } from "lucide-react";
import type { Collection, Product } from "@/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { useWishlist } from "@/context/WishlistContext";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  collection: Collection;
  products: Product[];
  previous?: Collection;
  next?: Collection;
}

export default function CollectionDetail({ collection, products, previous, next }: Props) {
  return (
    <div>
      <Hero collection={collection} />
      <Manifesto collection={collection} />
      <ProductGrid products={products} />
      <LookbookStrip collection={collection} products={products} />
      <NextChapter previous={previous} next={next} current={collection} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function Hero({ collection }: { collection: Collection }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section ref={ref} className="relative h-[100svh] w-full overflow-hidden grain">
      <motion.div style={{ scale, y }} className="absolute inset-0">
        <Image
          src={collection.heroImage}
          alt={collection.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/10 via-navy/20 to-navy/75" />
      </motion.div>

      <div className="relative z-10 shell h-full flex flex-col">
        <div className="pt-6">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-cream/80 text-[11px] tracking-[0.3em] uppercase link-swipe hover:text-cream"
          >
            <ArrowLeft size={14} /> All collections
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-end pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="flex items-center gap-3 text-cream/80 mb-6"
          >
            <span className="text-[10px] tracking-[0.3em] uppercase bg-cream/10 backdrop-blur border border-cream/20 px-2.5 py-1">
              {collection.season}
            </span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-cream/60">
              {formatDate(collection.launchDate, { year: "numeric", month: "long" })}
            </span>
          </motion.div>

          <h1 className="text-cream">
            <MaskLine delay={0.15}>
              <span className="font-display text-[clamp(4rem,16vw,14rem)] leading-[0.88] tracking-tight italic">
                {collection.name}
              </span>
            </MaskLine>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-10 max-w-lg text-cream/85 leading-relaxed"
          >
            {collection.description}
          </motion.p>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-cream/60 text-[10px] tracking-[0.3em] uppercase z-10 flex flex-col items-center gap-2"
      >
        <span>Shop collection</span>
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

// ────────────────────────────────────────────────────────────
function Manifesto({ collection }: { collection: Collection }) {
  return (
    <section className="shell py-28 md:py-40 relative">
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
            The manifesto
          </p>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] text-navy tracking-tight">
            Every chapter <span className="italic">has a thesis.</span>
          </h2>
          <div className="mt-10 space-y-5 text-ink/75 leading-relaxed">
            <p>
              {collection.description}
            </p>
            <p>
              Each piece is cut in small runs at our {collection.season === "Continuous" ? "ongoing" : collection.season} pace
              — never more than we can finish by hand, never less than what the season asks for.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="grid grid-cols-2 gap-5 md:gap-8 self-end"
        >
          <Meta label="Pieces" value={String(collection.productIds.length).padStart(2, "0")} />
          <Meta label="Season" value={collection.season} />
          <Meta label="Launched" value={formatDate(collection.launchDate, { year: "numeric", month: "short" })} />
          <Meta label="Made in" value="New York · Italy" />
        </motion.div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-navy/15 pt-5">
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink/50">{label}</p>
      <p className="font-display text-xl md:text-2xl text-navy mt-2 tabular">{value}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function ProductGrid({ products }: { products: Product[] }) {
  const { toggleWishlist, isInWishlist } = useWishlist();

  if (products.length === 0) return null;

  return (
    <section className="bg-bone py-28 md:py-40">
      <div className="shell">
        <div className="flex items-end justify-between mb-14 md:mb-20">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
              Shop the chapter
            </p>
            <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] text-navy tracking-tight">
              The <span className="italic">pieces.</span>
            </h2>
          </div>
          <p className="hidden md:block text-xs tracking-[0.25em] uppercase text-ink/50 tabular">
            {String(products.length).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-14 md:gap-x-7 md:gap-y-24">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: (i % 3) * 0.08 }}
            >
              <Link href={`/products/${p.slug}`} className="group block">
                <div className="relative aspect-portrait overflow-hidden bg-cream">
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
                  {p.isNew && (
                    <span className="absolute top-3 left-3 bg-gold text-navy text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
                      New
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 text-[10px] tracking-[0.3em] uppercase text-cream bg-navy/60 backdrop-blur px-2 py-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
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
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
function LookbookStrip({
  collection,
  products,
}: {
  collection: Collection;
  products: Product[];
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);

  // Build strip from product imagery + hero
  const images = [
    collection.heroImage,
    ...products.slice(0, 4).flatMap((p) => p.images).slice(0, 5),
  ];

  return (
    <section ref={ref} className="relative py-24 md:py-40 overflow-hidden bg-navy text-cream">
      <div className="shell flex items-end justify-between mb-10 md:mb-14">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
            Campaign · {collection.season}
          </p>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight">
            {collection.name}, <span className="italic">rendered.</span>
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            aria-label="Play campaign film"
            className="h-12 w-12 grid place-items-center rounded-full border border-cream/30 hover:bg-gold hover:border-gold hover:text-navy transition-colors"
          >
            <Play size={16} />
          </button>
          <span className="text-[11px] tracking-[0.3em] uppercase text-cream/60">
            Watch the film
          </span>
        </div>
      </div>

      <motion.div style={{ x }} className="flex gap-5 md:gap-8 pl-6 md:pl-14">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={`relative shrink-0 overflow-hidden ${
              i % 3 === 1 ? "aspect-[3/4] w-[55vw] md:w-[36vw]" : "aspect-banner w-[80vw] md:w-[48vw]"
            }`}
          >
            <Image
              src={src}
              alt={`${collection.name} look ${i + 1}`}
              fill
              sizes="55vw"
              className="object-cover"
            />
            <div className="absolute bottom-5 left-5 text-[10px] tracking-[0.3em] uppercase text-cream bg-navy/50 backdrop-blur px-2 py-1">
              {collection.name} · {String(i + 1).padStart(2, "0")}
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
function NextChapter({
  previous,
  next,
  current,
}: {
  previous?: Collection;
  next?: Collection;
  current: Collection;
}) {
  if (!previous && !next) return null;

  return (
    <section className="bg-cream py-20 md:py-28 border-t border-navy/10">
      <div className="shell">
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-10 text-center">
          Continue reading
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {previous ? (
            <ChapterCard collection={previous} label="Previous chapter" align="left" />
          ) : (
            <div className="hidden md:block" />
          )}
          {next ? (
            <ChapterCard collection={next} label="Next chapter" align="right" />
          ) : (
            <ChapterCard collection={current} label="Back to top" align="right" selfLink="top" />
          )}
        </div>
      </div>
    </section>
  );
}

function ChapterCard({
  collection,
  label,
  align,
  selfLink,
}: {
  collection: Collection;
  label: string;
  align: "left" | "right";
  selfLink?: "top";
}) {
  const href = selfLink === "top" ? "/collections" : `/collections/${collection.slug}`;
  return (
    <Link
      href={href}
      className={`group relative block aspect-[21/9] overflow-hidden bg-navy ${
        align === "right" ? "text-right" : ""
      }`}
    >
      <Image
        src={collection.heroImage}
        alt={collection.name}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-navy/30 to-navy/70" />
      <div
        className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-between ${
          align === "right" ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`flex items-center gap-3 text-cream ${
            align === "right" ? "flex-row-reverse" : ""
          }`}
        >
          {align === "left" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          <span className="text-[10px] tracking-[0.3em] uppercase">{label}</span>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">
            {collection.season}
          </p>
          <h3 className="font-display text-4xl md:text-5xl text-cream tracking-tight group-hover:text-gold transition-colors duration-500">
            {collection.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}
