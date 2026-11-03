"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Collection } from "@/types";
import { formatDate } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CollectionsIndex({ collections }: { collections: Collection[] }) {
  return (
    <div>
      <IntroHeader count={collections.length} />
      <div className="shell pb-32 md:pb-48 space-y-28 md:space-y-40">
        {collections.map((c, i) => (
          <CollectionRow key={c.id} collection={c} index={i} reverse={i % 2 === 1} />
        ))}
      </div>
    </div>
  );
}

function IntroHeader({ count }: { count: number }) {
  return (
    <header className="shell pt-36 md:pt-48 pb-20 md:pb-32 relative">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-[11px] tracking-[0.35em] uppercase text-gold mb-8"
      >
        /Collections · {String(count).padStart(2, "0")} chapters
      </motion.p>

      <div className="overflow-hidden">
        <motion.h1
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
          className="font-display text-[clamp(3rem,10vw,10rem)] leading-[0.9] tracking-tight text-navy"
        >
          Chapters of <span className="italic">the house.</span>
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4 }}
        className="mt-10 max-w-xl grid md:grid-cols-[1fr_auto] gap-8 items-end"
      >
        <p className="text-ink/70 leading-relaxed">
          Every season is a conversation — what we observe, what we reach for, what we want to
          build. Below are the collections currently in rotation, each one still buyable, still shipping.
        </p>
        <div className="flex items-center gap-5 shrink-0">
          <span className="h-px w-14 bg-navy/40" />
          <span className="text-[11px] tracking-[0.3em] uppercase text-navy/60">
            scroll to explore
          </span>
        </div>
      </motion.div>
    </header>
  );
}

function CollectionRow({
  collection,
  index,
  reverse,
}: {
  collection: Collection;
  index: number;
  reverse: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const textX = useTransform(scrollYProgress, [0, 1], reverse ? [30, -30] : [-30, 30]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, ease: EASE }}
      className={`grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-center ${
        reverse ? "lg:[&>a]:order-2" : ""
      }`}
    >
      <Link
        href={`/collections/${collection.slug}`}
        className="group relative block aspect-[4/5] lg:aspect-[3/4] overflow-hidden bg-navy"
      >
        <motion.div style={{ y: imageY }} className="absolute inset-[-5%]">
          <Image
            src={collection.heroImage}
            alt={collection.name}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-tr from-navy/30 via-transparent to-transparent" />

        <div className="absolute top-5 left-5 flex items-center gap-2 text-cream">
          <span className="text-[10px] tracking-[0.3em] uppercase bg-cream/10 backdrop-blur border border-cream/20 px-2.5 py-1">
            {collection.season}
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-cream/60">
            Chapter {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="absolute bottom-5 right-5 h-14 w-14 grid place-items-center rounded-full bg-cream/15 backdrop-blur border border-cream/30 text-cream group-hover:bg-gold group-hover:border-gold group-hover:text-navy transition-all duration-500">
          <ArrowUpRight size={20} />
        </div>

        {/* Oversized season label */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 font-display text-[clamp(5rem,15vw,14rem)] leading-[0.8] text-cream/[0.08] tracking-tight select-none pointer-events-none pl-5 pb-2"
        >
          {collection.season}
        </div>
      </Link>

      <motion.div style={{ x: textX }} className="max-w-xl">
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
          {formatDate(collection.launchDate, { year: "numeric", month: "long" })} · Live
        </p>
        <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] text-navy tracking-tight">
          <span className="italic">{collection.name}</span>
        </h2>

        <p className="mt-6 text-ink/70 leading-relaxed">{collection.description}</p>

        <div className="mt-10 flex items-center gap-6">
          <Link href={`/collections/${collection.slug}`} className="btn-primary">
            Enter collection
            <ArrowUpRight size={14} />
          </Link>
          <span className="text-[11px] tracking-[0.3em] uppercase text-ink/50 tabular">
            {collection.productIds.length} pieces
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
