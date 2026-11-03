"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import type { LookbookEntry } from "@/types";
import { formatDate } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LookbookIndex({ lookbooks }: { lookbooks: LookbookEntry[] }) {
  return (
    <>
      <IntroHeader count={lookbooks.length} />
      <div className="shell pb-32 md:pb-48 space-y-28 md:space-y-44">
        {lookbooks.map((lb, i) => (
          <LookbookCard key={lb.id} lookbook={lb} index={i} reverse={i % 2 === 1} />
        ))}
      </div>
      <ClosingBanner />
    </>
  );
}

function IntroHeader({ count }: { count: number }) {
  return (
    <header className="shell pt-36 md:pt-48 pb-20 md:pb-32">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-[11px] tracking-[0.35em] uppercase text-gold mb-8"
      >
        /Lookbook · {String(count).padStart(2, "0")} editorials
      </motion.p>

      <div className="overflow-hidden">
        <motion.h1
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
          className="font-display text-[clamp(3rem,11vw,11rem)] leading-[0.88] tracking-tight text-navy"
        >
          Seen in <span className="italic">frame.</span>
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4 }}
        className="mt-12 grid md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-end"
      >
        <p className="max-w-md text-ink/70 leading-relaxed">
          Our lookbooks are a slower kind of catalog — editorial captures of every collection,
          shot with the photographers and stylists who understand the house. Scroll through, linger,
          shop what you see.
        </p>
        <div className="flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-navy/60 md:justify-end">
          <span className="hidden md:block h-px w-16 bg-navy/40" />
          <span>Scroll slowly</span>
        </div>
      </motion.div>
    </header>
  );
}

function LookbookCard({
  lookbook,
  index,
  reverse,
}: {
  lookbook: LookbookEntry;
  index: number;
  reverse: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-60, 60]);
  const captionX = useTransform(scrollYProgress, [0, 1], reverse ? [40, -40] : [-40, 40]);

  const inset = lookbook.images[1] ?? lookbook.images[0];

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 1.1, ease: EASE }}
      className="relative"
    >
      <div className={`grid lg:grid-cols-12 gap-6 md:gap-10 items-start ${reverse ? "" : ""}`}>
        <Link
          href={`/lookbook/${lookbook.slug}`}
          className={`group relative block col-span-12 lg:col-span-8 ${
            reverse ? "lg:col-start-5" : "lg:col-start-1"
          }`}
        >
          <div className="relative aspect-[4/5] lg:aspect-[16/10] overflow-hidden bg-navy">
            <motion.div style={{ y }} className="absolute inset-[-6%]">
              <Image
                src={lookbook.coverImage}
                alt={lookbook.title}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.04]"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-tr from-navy/30 via-transparent to-transparent" />

            {/* Indicator pill */}
            <div className="absolute top-5 left-5 flex items-center gap-2 text-cream text-[10px] tracking-[0.3em] uppercase">
              <span className="bg-cream/10 backdrop-blur border border-cream/20 px-2.5 py-1">
                {lookbook.season}
              </span>
              <span className="text-cream/60">
                Chapter {String(index).padStart(2, "0")}
              </span>
            </div>

            {/* Enter */}
            <div className="absolute bottom-5 right-5 h-14 w-14 grid place-items-center rounded-full bg-cream/15 backdrop-blur border border-cream/30 text-cream group-hover:bg-gold group-hover:border-gold group-hover:text-navy transition-all duration-500">
              <ArrowUpRight size={20} />
            </div>

            {/* Huge season watermark */}
            <div
              aria-hidden
              className="absolute bottom-0 left-0 right-0 font-display italic text-[clamp(5rem,18vw,18rem)] leading-[0.8] text-cream/[0.07] tracking-tight select-none pointer-events-none pl-6 pb-2"
            >
              {lookbook.title}
            </div>
          </div>
        </Link>

        {/* Inset caption / detail card */}
        <motion.div
          style={{ x: captionX }}
          className={`col-span-12 lg:col-span-4 ${
            reverse ? "lg:col-start-1 lg:row-start-1 lg:pr-10" : "lg:col-start-9 lg:pl-10"
          } self-center`}
        >
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
            {formatDate(lookbook.date, { year: "numeric", month: "long" })}
          </p>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-tight text-navy">
            <span className="italic">{lookbook.title}</span>
          </h2>
          {lookbook.subtitle && (
            <p className="mt-3 text-[11px] tracking-[0.3em] uppercase text-navy/60">
              {lookbook.subtitle}
            </p>
          )}

          {lookbook.description && (
            <p className="mt-6 text-ink/70 leading-relaxed">{lookbook.description}</p>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 text-[11px]">
            {lookbook.photographer && (
              <MetaLine label="Photography" value={lookbook.photographer} />
            )}
            {lookbook.stylist && <MetaLine label="Styling" value={lookbook.stylist} />}
            {lookbook.location && <MetaLine label="Location" value={lookbook.location} />}
            <MetaLine
              label="Frames"
              value={String(lookbook.images.length).padStart(2, "0")}
            />
          </div>

          <div className="mt-10">
            <Link href={`/lookbook/${lookbook.slug}`} className="btn-primary">
              Enter editorial
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* small inset image */}
          <div className="mt-10 hidden lg:block relative aspect-[4/5] overflow-hidden">
            <Image
              src={inset}
              alt=""
              fill
              sizes="30vw"
              className="object-cover grayscale hover:grayscale-0 transition-all duration-[1.2s]"
            />
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-navy/15 pt-3">
      <p className="tracking-[0.3em] uppercase text-ink/45">{label}</p>
      <p className="text-navy mt-1 tracking-wide">{value}</p>
    </div>
  );
}

function ClosingBanner() {
  return (
    <section className="relative bg-navy text-cream py-28 md:py-40 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(201,161,74,0.22),transparent_55%)] pointer-events-none"
      />
      <div className="shell relative text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-6">
          Next issue
        </p>
        <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-tight">
          We are always <span className="italic">shooting.</span>
        </h2>
        <p className="mt-6 max-w-lg mx-auto text-cream/70 leading-relaxed">
          The next editorial is in post-production. Members on the house list see it first.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/collections" className="btn-ghost text-cream border-cream/40 hover:border-cream">
            <span>Explore collections</span>
          </Link>
          <Link href="/#newsletter" className="btn-primary">
            Join the list
          </Link>
        </div>
      </div>
    </section>
  );
}
