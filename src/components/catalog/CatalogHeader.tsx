"use client";

import { motion } from "framer-motion";
import { useQueryState } from "@/lib/queryState";
import { cn } from "@/lib/utils";

// Quick machine-type filters — the most common machine classes a buyer shops
// by. Maps to the `machineType` query param (backend `machine_models__machine_type`).
const MACHINE_TYPES = [
  { label: "All types", value: null },
  { label: "Lockstitch", value: "lockstitch" },
  { label: "Overlock", value: "overlock" },
  { label: "Flatlock", value: "flatlock" },
  { label: "Buttonhole", value: "buttonhole" },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CatalogHeader({
  total,
  sort,
}: {
  total: number;
  sort: string;
}) {
  const { get, set } = useQueryState();
  const activeType = get("machineType");
  const q = get("q");

  const sortLabels: Record<string, string> = {
    featured: "Featured",
    newest: "New in",
    "price-asc": "Low → high",
    "price-desc": "High → low",
    rating: "Top rated",
    popular: "Most reviewed",
  };

  const typeLabel = MACHINE_TYPES.find((t) => t.value === activeType)?.label;

  return (
    <header className="shell pt-36 md:pt-44 pb-10 md:pb-14">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-[11px] tracking-[0.35em] uppercase text-gold mb-8"
      >
        /Shop · {String(total).padStart(2, "0")} parts · {sortLabels[sort] ?? "Curated"}
      </motion.p>

      <div className="overflow-hidden">
        <motion.h1
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 1, ease: EASE }}
          className="font-display text-[clamp(2.75rem,9vw,8.5rem)] leading-[0.9] tracking-tight text-navy"
        >
          {q ? (
            <>
              Results for <span className="italic">“{q}”</span>
            </>
          ) : activeType && typeLabel ? (
            <>
              <span className="italic">{typeLabel}</span> parts.
            </>
          ) : (
            <>
              Every <span className="italic">part</span> in stock.
            </>
          )}
        </motion.h1>
      </div>

      {/* Machine-type quick filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.3 }}
        className="mt-12 flex flex-wrap items-center gap-1 md:gap-2"
      >
        {MACHINE_TYPES.map((t) => {
          const active = (t.value ?? null) === (activeType ?? null);
          return (
            <button
              key={t.label}
              onClick={() => set("machineType", t.value)}
              className={cn(
                "relative px-5 py-2.5 text-[11px] tracking-[0.25em] uppercase rounded-full transition-colors",
                active
                  ? "bg-navy text-cream"
                  : "bg-transparent text-ink/70 hover:text-navy border border-navy/15 hover:border-navy/40",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </motion.div>
    </header>
  );
}
