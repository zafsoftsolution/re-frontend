"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { LookbookEntry, Product } from "@/types";
import { formatDate, formatPrice } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  lookbook: LookbookEntry;
  products: Product[];
  previous?: LookbookEntry;
  next?: LookbookEntry;
}

export default function LookbookDetail({ lookbook, products, previous, next }: Props) {
  const frames = lookbook.images;

  return (
    <div className="bg-cream">
      <Hero lookbook={lookbook} />
      <Intro lookbook={lookbook} />

      {/* Editorial frame sequence — alternating layouts */}
      <section className="relative">
        {/* Frame 01 — full bleed */}
        {frames[0] && (
          <FrameFullBleed
            src={frames[0]}
            caption={`Look 01 · ${lookbook.title}`}
            credit={lookbook.photographer}
          />
        )}

        {/* Frames 02 & 03 — diptych */}
        {frames[1] && frames[2] && (
          <Diptych left={frames[1]} right={frames[2]} title={lookbook.title} startIndex={2} />
        )}

        {/* Interlude quote */}
        {lookbook.intro && <Interlude intro={lookbook.intro} lookbook={lookbook} />}

        {/* Frame 04 — tall portrait centered */}
        {frames[3] && (
          <FrameCentered src={frames[3]} caption={`Look 04 · ${lookbook.title}`} />
        )}

        {/* Frames 05-07 — asymmetric trio */}
        {frames[4] && (
          <AsymmetricTrio
            a={frames[4]}
            b={frames[5] ?? frames[0]}
            c={frames[6] ?? frames[1]}
            title={lookbook.title}
          />
        )}

        {/* Remaining frames — editorial sequence */}
        {frames.length > 7 && (
          <FrameFullBleed
            src={frames[7]}
            caption={`Look ${String(frames.length - 1).padStart(2, "0")} · ${lookbook.title}`}
            credit={lookbook.stylist ? `Styling · ${lookbook.stylist}` : undefined}
          />
        )}
        {frames.length > 9 && (
          <Diptych
            left={frames[8]}
            right={frames[9]}
            title={lookbook.title}
            startIndex={frames.length - 1}
          />
        )}
      </section>

      <ShopTheLooks products={products} />
      <Credits lookbook={lookbook} />
      <NextChapter previous={previous} next={next} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function Hero({ lookbook }: { lookbook: LookbookEntry }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.15]);

  return (
    <section ref={ref} className="relative h-[100svh] w-full overflow-hidden grain">
      <motion.div style={{ scale, y }} className="absolute inset-0">
        <Image
          src={lookbook.coverImage}
          alt={lookbook.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/5 via-transparent to-navy/85" />
      </motion.div>

      <motion.div style={{ opacity }} className="relative z-10 shell h-full flex flex-col">
        <div className="pt-6 flex items-center justify-between text-cream/80 text-[11px] tracking-[0.3em] uppercase">
          <Link href="/lookbook" className="inline-flex items-center gap-2 link-swipe hover:text-cream">
            <ArrowLeft size={14} /> All lookbooks
          </Link>
          <span className="hidden md:block">
            {formatDate(lookbook.date, { year: "numeric", month: "long" })} · {lookbook.location}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-end pb-16 md:pb-24">
          {lookbook.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="text-cream/80 text-[11px] tracking-[0.35em] uppercase mb-6"
            >
              {lookbook.subtitle}
            </motion.p>
          )}

          <h1 className="text-cream">
            <MaskLine delay={0.1}>
              <span className="font-display italic text-[clamp(4rem,18vw,16rem)] leading-[0.85] tracking-tight">
                {lookbook.title}
              </span>
            </MaskLine>
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-10 flex flex-col md:flex-row gap-6 md:items-end md:justify-between"
          >
            {lookbook.description && (
              <p className="max-w-md text-cream/80 leading-relaxed">{lookbook.description}</p>
            )}
            <div className="flex items-center gap-3 text-cream/80">
              <span className="text-[10px] tracking-[0.3em] uppercase">
                {String(lookbook.images.length).padStart(2, "0")} frames
              </span>
              <span className="h-px w-10 bg-gold" />
              <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
            </div>
          </motion.div>
        </div>
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
        transition={{ duration: 1.2, delay, ease: EASE }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────
function Intro({ lookbook }: { lookbook: LookbookEntry }) {
  if (!lookbook.intro) return null;
  return (
    <section className="shell py-28 md:py-40 grid md:grid-cols-[1fr_1.6fr] gap-12 md:gap-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
          Editor&apos;s note
        </p>
        <h2 className="font-display text-3xl md:text-4xl text-navy tracking-tight">
          A <span className="italic">quiet</span> premise.
        </h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
        className="font-display text-[clamp(1.25rem,2.2vw,1.75rem)] leading-[1.4] text-ink/85"
      >
        {lookbook.intro}
      </motion.p>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
function FrameFullBleed({
  src,
  caption,
  credit,
}: {
  src: string;
  caption?: string;
  credit?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-80, 80]);

  return (
    <motion.figure
      ref={ref}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 1.2 }}
      className="relative w-full aspect-[16/10] overflow-hidden my-10 md:my-20"
    >
      <motion.div style={{ y }} className="absolute inset-[-8%]">
        <Image src={src} alt={caption ?? ""} fill sizes="100vw" className="object-cover" />
      </motion.div>
      {caption && (
        <figcaption className="absolute bottom-5 left-6 md:bottom-8 md:left-10 text-cream text-[10px] tracking-[0.3em] uppercase flex items-center gap-3">
          <span className="h-px w-10 bg-gold" />
          <span>{caption}</span>
          {credit && (
            <>
              <span className="text-cream/40">·</span>
              <span className="text-cream/70">{credit}</span>
            </>
          )}
        </figcaption>
      )}
    </motion.figure>
  );
}

function FrameCentered({ src, caption }: { src: string; caption?: string }) {
  return (
    <section className="shell py-10 md:py-20 flex justify-center">
      <motion.figure
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: EASE }}
        className="relative aspect-[3/4] w-full max-w-2xl overflow-hidden"
      >
        <Image src={src} alt={caption ?? ""} fill sizes="(max-width: 1024px) 90vw, 42vw" className="object-cover" />
        {caption && (
          <figcaption className="absolute bottom-5 left-5 text-cream text-[10px] tracking-[0.3em] uppercase bg-navy/40 backdrop-blur px-3 py-1.5">
            {caption}
          </figcaption>
        )}
      </motion.figure>
    </section>
  );
}

function Diptych({
  left,
  right,
  title,
  startIndex,
}: {
  left: string;
  right: string;
  title: string;
  startIndex: number;
}) {
  return (
    <section className="shell py-10 md:py-20 grid md:grid-cols-2 gap-4 md:gap-6">
      <DiptychFrame src={left} caption={`${title} · ${String(startIndex - 1).padStart(2, "0")}`} offset={50} />
      <DiptychFrame src={right} caption={`${title} · ${String(startIndex).padStart(2, "0")}`} offset={-50} />
    </section>
  );
}

function DiptychFrame({ src, caption, offset }: { src: string; caption: string; offset: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  return (
    <motion.figure
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1, ease: EASE }}
      className="relative aspect-[4/5] overflow-hidden"
    >
      <motion.div style={{ y }} className="absolute inset-[-6%]">
        <Image src={src} alt={caption} fill sizes="50vw" className="object-cover" />
      </motion.div>
      <figcaption className="absolute bottom-4 left-4 text-cream text-[10px] tracking-[0.3em] uppercase bg-navy/40 backdrop-blur px-2.5 py-1">
        {caption}
      </figcaption>
    </motion.figure>
  );
}

function AsymmetricTrio({
  a,
  b,
  c,
  title,
}: {
  a: string;
  b: string;
  c: string;
  title: string;
}) {
  return (
    <section className="shell py-10 md:py-24 grid md:grid-cols-12 gap-4 md:gap-6">
      <motion.figure
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative md:col-span-5 md:col-start-1 aspect-[3/4] overflow-hidden md:mt-16"
      >
        <Image src={a} alt={`${title}`} fill sizes="40vw" className="object-cover" />
      </motion.figure>
      <motion.figure
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
        className="relative md:col-span-7 md:col-start-6 aspect-[4/5] overflow-hidden"
      >
        <Image src={b} alt={`${title}`} fill sizes="55vw" className="object-cover" />
      </motion.figure>
      <motion.figure
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
        className="relative md:col-span-4 md:col-start-3 md:-mt-28 aspect-[3/4] overflow-hidden hidden md:block"
      >
        <Image src={c} alt={`${title}`} fill sizes="28vw" className="object-cover grayscale" />
      </motion.figure>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
function Interlude({ intro, lookbook }: { intro: string; lookbook: LookbookEntry }) {
  return (
    <section className="bg-navy text-cream py-28 md:py-40 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(201,161,74,0.18),transparent_55%)] pointer-events-none"
      />
      <div className="shell relative max-w-4xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-[11px] tracking-[0.3em] uppercase text-gold mb-8"
        >
          Interlude · {lookbook.location}
        </motion.p>
        <motion.blockquote
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: EASE }}
          className="font-display italic text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.25] tracking-tight"
        >
          &ldquo;{intro}&rdquo;
        </motion.blockquote>
        <div className="mt-10 flex items-center gap-4 text-cream/70 text-[11px] tracking-[0.3em] uppercase">
          <span className="h-px w-12 bg-gold" />
          <span>{lookbook.photographer}</span>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
function ShopTheLooks({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="shell py-28 md:py-40">
      <div className="flex items-end justify-between mb-14 md:mb-20">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
            Shop the looks
          </p>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] text-navy tracking-tight">
            Take the <span className="italic">frame</span> home.
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-6 md:gap-y-20">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: (i % 4) * 0.07 }}
          >
            <Link href={`/products/${p.slug}`} className="group block">
              <div className="relative aspect-editorial overflow-hidden bg-bone">
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute top-3 left-3 text-[10px] tracking-[0.3em] uppercase text-cream bg-navy/60 backdrop-blur px-2 py-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base text-navy truncate">{p.name}</h3>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mt-1 truncate">
                    {p.category}
                  </p>
                </div>
                <p className="font-display text-sm text-navy shrink-0">{formatPrice(p.price)}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
function Credits({ lookbook }: { lookbook: LookbookEntry }) {
  return (
    <section className="bg-bone py-24 md:py-32 border-t border-navy/10">
      <div className="shell grid md:grid-cols-[1fr_auto] gap-10 items-end">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">Credits</p>
          <h2 className="font-display text-3xl md:text-5xl text-navy tracking-tight">
            Made <span className="italic">with.</span>
          </h2>
        </div>
        <dl className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
          {lookbook.photographer && <Credit label="Photography" value={lookbook.photographer} />}
          {lookbook.stylist && <Credit label="Styling" value={lookbook.stylist} />}
          {lookbook.location && <Credit label="Location" value={lookbook.location} />}
          <Credit label="Season" value={lookbook.season} />
          <Credit
            label="Published"
            value={formatDate(lookbook.date, { year: "numeric", month: "long", day: "numeric" })}
          />
          <Credit label="Frames" value={String(lookbook.images.length).padStart(2, "0")} />
        </dl>
      </div>
    </section>
  );
}

function Credit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.3em] uppercase text-ink/50">{label}</dt>
      <dd className="text-navy mt-1">{value}</dd>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function NextChapter({
  previous,
  next,
}: {
  previous?: LookbookEntry;
  next?: LookbookEntry;
}) {
  if (!previous && !next) return null;

  return (
    <section className="bg-navy text-cream py-20 md:py-28">
      <div className="shell">
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-10 text-center">
          Continue reading
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {previous ? (
            <ChapterCard lookbook={previous} label="Previous" icon="left" />
          ) : (
            <BackToIndex />
          )}
          {next ? (
            <ChapterCard lookbook={next} label="Next" icon="right" />
          ) : (
            <BackToIndex />
          )}
        </div>
      </div>
    </section>
  );
}

function ChapterCard({
  lookbook,
  label,
  icon,
}: {
  lookbook: LookbookEntry;
  label: string;
  icon: "left" | "right";
}) {
  return (
    <Link
      href={`/lookbook/${lookbook.slug}`}
      className="group relative block aspect-[21/9] overflow-hidden bg-navy-deep"
    >
      <Image
        src={lookbook.coverImage}
        alt={lookbook.title}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-navy/60" />
      <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between">
        <div className="flex items-center gap-2 text-cream/80 text-[10px] tracking-[0.3em] uppercase">
          {icon === "left" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          <span>{label}</span>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-2">
            {lookbook.season}
          </p>
          <h3 className="font-display text-3xl md:text-5xl italic tracking-tight group-hover:text-gold transition-colors duration-500">
            {lookbook.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

function BackToIndex() {
  return (
    <Link
      href="/lookbook"
      className="group relative block aspect-[21/9] overflow-hidden bg-navy-deep border border-cream/10"
    >
      <div className="absolute inset-0 p-8 md:p-10 grid place-items-center text-center">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">
            Return
          </p>
          <h3 className="font-display text-3xl md:text-4xl italic tracking-tight group-hover:text-gold transition-colors duration-500 flex items-center gap-3">
            All lookbooks <ArrowUpRight size={22} />
          </h3>
        </div>
      </div>
    </Link>
  );
}
