"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import FilterRail, { Facets } from "./FilterRail";
import { useQueryState } from "@/lib/queryState";

export default function MobileFilterDrawer({
  facets,
  activeFilterCount,
}: {
  facets: Facets;
  activeFilterCount: number;
}) {
  const [open, setOpen] = useState(false);
  const { clearAll } = useQueryState();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center gap-2 text-sm text-navy border border-navy/20 rounded-full px-4 py-2.5 hover:bg-navy hover:text-cream transition-colors"
      >
        <SlidersHorizontal size={15} />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 bg-gold text-navy text-[10px] font-semibold min-w-5 h-5 px-1.5 rounded-full grid place-items-center tabular">
            {activeFilterCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-navy/50 z-[55] lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 w-full max-w-sm bg-cream z-[56] lg:hidden flex flex-col"
              data-lenis-prevent
            >
              <div className="flex items-center justify-between p-5 border-b border-navy/10">
                <h3 className="font-display text-xl text-navy">Filter</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="h-10 w-10 grid place-items-center hover:bg-navy/5 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5">
                <FilterRail facets={facets} />
              </div>

              <div className="p-5 border-t border-navy/10 flex gap-3">
                <button
                  onClick={() => {
                    clearAll();
                    setOpen(false);
                  }}
                  className="flex-1 py-3.5 text-[11px] tracking-[0.25em] uppercase text-navy border border-navy/30 rounded-full hover:bg-navy/5"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-3.5 text-[11px] tracking-[0.25em] uppercase bg-navy text-cream rounded-full hover:bg-navy-deep"
                >
                  View results
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
