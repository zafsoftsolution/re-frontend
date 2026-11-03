"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useQueryState } from "@/lib/queryState";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "New arrivals" },
  { value: "price-asc", label: "Price · low to high" },
  { value: "price-desc", label: "Price · high to low" },
  { value: "rating", label: "Top rated" },
  { value: "popular", label: "Most reviewed" },
];

export default function SortControl() {
  const { get, set } = useQueryState();
  const current = get("sort") ?? "featured";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Featured";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-navy border border-navy/20 rounded-full pl-4 pr-3 py-2.5 hover:border-navy/50 transition-colors min-w-48 justify-between"
      >
        <span className="text-[11px] tracking-[0.2em] uppercase text-ink/50">Sort</span>
        <span>{currentLabel}</span>
        <ChevronDown
          size={14}
          className={cn("text-navy/60 transition-transform", open ? "rotate-180" : "")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-60 bg-cream border border-navy/10 rounded-2xl p-2 z-40 shadow-xl shadow-navy/5"
          >
            {SORT_OPTIONS.map((opt) => {
              const active = opt.value === current;
              return (
                <li key={opt.value}>
                  <button
                    onClick={() => {
                      set("sort", opt.value === "featured" ? null : opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between",
                      active ? "text-navy font-medium bg-navy/5" : "text-ink/75 hover:bg-navy/5"
                    )}
                  >
                    {opt.label}
                    {active && <span className="h-1.5 w-1.5 bg-gold rounded-full" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
