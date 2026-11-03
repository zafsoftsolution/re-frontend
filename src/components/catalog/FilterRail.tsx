"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { useState, useEffect } from "react";
import type { ProductFacets } from "@/lib/storefront";
import { useQueryState } from "@/lib/queryState";
import { cn, currencySymbol } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const CCY = currencySymbol(siteConfig.currency.code);

/** Filter options for the catalog rail — sourced from the backend facets endpoint. */
export type Facets = ProductFacets;

interface Props {
  facets: Facets;
  className?: string;
}

export default function FilterRail({ facets, className }: Props) {
  return (
    <aside className={cn("space-y-2", className)}>
      <FilterGroup title="Machine brand" defaultOpen>
        <MachineBrandFilter facets={facets} />
      </FilterGroup>

      <FilterGroup title="Part category" defaultOpen>
        <CategoryFilter categories={facets.categories} />
      </FilterGroup>

      <FilterGroup title="Parts brand">
        <PartsBrandFilter brands={facets.partsBrands} />
      </FilterGroup>

      <FilterGroup title="Machine type">
        <MachineTypeFilter types={facets.machineTypes} />
      </FilterGroup>

      <FilterGroup title="Price">
        <PriceFilter min={Math.floor(facets.price.min)} max={Math.ceil(facets.price.max)} />
      </FilterGroup>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
function FilterGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-navy/10 py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between group"
        aria-expanded={open}
      >
        <span className="font-display text-base text-navy tracking-wide">{title}</span>
        <ChevronDown
          size={16}
          className={cn(
            "text-navy/60 transition-transform duration-300",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Machine brand (+ cascading model) ────────────────────────
function MachineBrandFilter({ facets }: { facets: Facets }) {
  const { get, set } = useQueryState();
  const currentBrand = get("machineBrand");
  const currentModel = get("machineModel");
  const activeBrand = facets.machineBrands.find((b) => b.slug === currentBrand);

  const pickBrand = (slug: string | null) => {
    set("machineModel", null); // reset the dependent model on brand change
    set("machineBrand", slug);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => pickBrand(null)}
            className={cn(
              "w-full text-left py-1.5 text-sm transition-colors",
              !currentBrand ? "text-navy font-medium" : "text-ink/60 hover:text-navy",
            )}
          >
            All machines
          </button>
        </li>
        {facets.machineBrands.map((b) => {
          const active = currentBrand === b.slug;
          return (
            <li key={b.slug}>
              <button
                onClick={() => pickBrand(active ? null : b.slug)}
                className={cn(
                  "w-full flex items-center justify-between text-left py-1.5 text-sm transition-colors",
                  active ? "text-navy font-medium" : "text-ink/75 hover:text-navy",
                )}
              >
                <span className="flex items-center gap-2">
                  {active && <span className="h-1 w-4 bg-gold" />}
                  {b.name}
                </span>
                <span className="text-[11px] tabular text-ink/40">{b.models.length}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Cascading model list — appears once a machine brand is chosen */}
      <AnimatePresence initial={false}>
        {activeBrand && activeBrand.models.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 pl-3 border-l border-navy/10 space-y-1.5">
              <p className="text-[10px] tracking-[0.22em] uppercase text-ink/45 pb-1">
                {activeBrand.name} models
              </p>
              {activeBrand.models.map((m) => {
                const active = currentModel === m.slug;
                return (
                  <button
                    key={m.slug}
                    onClick={() => set("machineModel", active ? null : m.slug)}
                    className={cn(
                      "w-full text-left py-1 text-[13px] transition-colors",
                      active ? "text-navy font-medium" : "text-ink/65 hover:text-navy",
                    )}
                  >
                    {active && <span className="inline-block h-1 w-3 bg-gold mr-2 align-middle" />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Part category ────────────────────────────────────────────
function CategoryFilter({ categories }: { categories: Facets["categories"] }) {
  const { get, set } = useQueryState();
  const current = get("category");
  return (
    <ul className="space-y-2">
      <li>
        <button
          onClick={() => set("category", null)}
          className={cn(
            "w-full flex items-center justify-between text-left py-1.5 text-sm transition-colors",
            !current ? "text-navy font-medium" : "text-ink/60 hover:text-navy",
          )}
        >
          <span>All categories</span>
          <span className="text-[11px] tabular text-ink/40">
            {categories.reduce((s, c) => s + c.count, 0)}
          </span>
        </button>
      </li>
      {categories.map((cat) => {
        const active = current === cat.slug;
        return (
          <li key={cat.slug}>
            <button
              onClick={() => set("category", active ? null : cat.slug)}
              className={cn(
                "w-full flex items-center justify-between text-left py-1.5 text-sm transition-colors",
                active ? "text-navy font-medium" : "text-ink/70 hover:text-navy",
              )}
            >
              <span className="flex items-center gap-2">
                {active && <span className="h-1 w-4 bg-gold" />}
                {cat.name}
              </span>
              <span className="text-[11px] tabular text-ink/40">{cat.count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Parts brand ──────────────────────────────────────────────
function PartsBrandFilter({ brands }: { brands: Facets["partsBrands"] }) {
  const { get, set } = useQueryState();
  const current = get("brand");
  return (
    <ul className="space-y-2">
      {brands.map((b) => {
        const active = current === b.slug;
        return (
          <li key={b.slug}>
            <button
              onClick={() => set("brand", active ? null : b.slug)}
              className={cn(
                "w-full flex items-center justify-between text-left py-1.5 text-sm transition-colors",
                active ? "text-navy font-medium" : "text-ink/75 hover:text-navy",
              )}
            >
              <span className="flex items-center gap-2">
                {active && <span className="h-1 w-4 bg-gold" />}
                {b.name}
              </span>
              {b.isOem && (
                <span className="text-[9px] tracking-[0.15em] uppercase text-gold border border-gold/40 rounded px-1.5 py-0.5">
                  OEM
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Machine type ─────────────────────────────────────────────
function MachineTypeFilter({ types }: { types: Facets["machineTypes"] }) {
  const { get, set } = useQueryState();
  const current = get("machineType");
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => {
        const active = current === t.value;
        return (
          <button
            key={t.value}
            onClick={() => set("machineType", active ? null : t.value)}
            className={cn(
              "px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase rounded-full border transition-all",
              active
                ? "bg-navy text-cream border-navy"
                : "border-navy/15 text-ink/75 hover:border-navy/50",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Price ────────────────────────────────────────────────────
function PriceFilter({ min, max }: { min: number; max: number }) {
  const { get, set } = useQueryState();
  const initialMin = Number(get("minPrice") ?? min);
  const initialMax = Number(get("maxPrice") ?? max);
  const [localMin, setLocalMin] = useState(initialMin);
  const [localMax, setLocalMax] = useState(initialMax);

  useEffect(() => {
    setLocalMin(initialMin);
    setLocalMax(initialMax);
  }, [initialMin, initialMax]);

  const commit = () => {
    set("minPrice", localMin > min ? String(localMin) : null);
    set("maxPrice", localMax < max ? String(localMax) : null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="tabular text-navy">{CCY} {localMin}</span>
        <span className="text-ink/40">—</span>
        <span className="tabular text-navy">{CCY} {localMax}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={10}
        value={localMax}
        onChange={(e) => setLocalMax(Number(e.target.value))}
        onMouseUp={commit}
        onTouchEnd={commit}
        className="w-full accent-navy"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[10px] tracking-[0.2em] uppercase text-ink/50">
          Min
          <input
            type="number"
            min={min}
            max={max}
            value={localMin}
            onChange={(e) => setLocalMin(Number(e.target.value))}
            onBlur={commit}
            className="mt-1 w-full bg-transparent border-b border-navy/20 py-1.5 text-sm text-navy outline-none focus:border-gold"
          />
        </label>
        <label className="text-[10px] tracking-[0.2em] uppercase text-ink/50">
          Max
          <input
            type="number"
            min={min}
            max={max}
            value={localMax}
            onChange={(e) => setLocalMax(Number(e.target.value))}
            onBlur={commit}
            className="mt-1 w-full bg-transparent border-b border-navy/20 py-1.5 text-sm text-navy outline-none focus:border-gold"
          />
        </label>
      </div>
    </div>
  );
}
