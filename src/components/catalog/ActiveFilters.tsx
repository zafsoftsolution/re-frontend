"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryState } from "@/lib/queryState";
import type { ProductFacets } from "@/lib/storefront";
import { currencySymbol } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const CCY = currencySymbol(siteConfig.currency.code);

interface Props {
  facets: ProductFacets;
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export default function ActiveFilters({ facets }: Props) {
  const { get, set, clearAll } = useQueryState();

  const chips: Chip[] = [];

  const machineBrand = get("machineBrand");
  const mb = facets.machineBrands.find((b) => b.slug === machineBrand);
  if (machineBrand) {
    chips.push({
      key: `mb-${machineBrand}`,
      label: mb?.name ?? machineBrand,
      onRemove: () => {
        set("machineModel", null);
        set("machineBrand", null);
      },
    });
  }

  const machineModel = get("machineModel");
  if (machineModel) {
    const model = mb?.models.find((m) => m.slug === machineModel);
    chips.push({
      key: `mm-${machineModel}`,
      label: model?.name ?? machineModel,
      onRemove: () => set("machineModel", null),
    });
  }

  const category = get("category");
  if (category) {
    const cat = facets.categories.find((c) => c.slug === category);
    chips.push({
      key: `c-${category}`,
      label: cat?.name ?? category,
      onRemove: () => set("category", null),
    });
  }

  const brand = get("brand");
  if (brand) {
    const pb = facets.partsBrands.find((b) => b.slug === brand);
    chips.push({
      key: `b-${brand}`,
      label: pb?.name ?? brand.replace(/-/g, " "),
      onRemove: () => set("brand", null),
    });
  }

  const machineType = get("machineType");
  if (machineType) {
    const t = facets.machineTypes.find((x) => x.value === machineType);
    chips.push({
      key: `mt-${machineType}`,
      label: t?.label ?? machineType,
      onRemove: () => set("machineType", null),
    });
  }

  const minPrice = get("minPrice");
  const maxPrice = get("maxPrice");
  if (minPrice || maxPrice) {
    chips.push({
      key: `p-${minPrice}-${maxPrice}`,
      label: `${CCY} ${minPrice ?? "0"} — ${CCY} ${maxPrice ?? "∞"}`,
      onRemove: () => {
        set("minPrice", null);
        set("maxPrice", null);
      },
    });
  }

  if (get("onSale") === "true") {
    chips.push({ key: "sale", label: "On sale", onRemove: () => set("onSale", null) });
  }

  const q = get("q");
  if (q) {
    chips.push({ key: `q-${q}`, label: `“${q}”`, onRemove: () => set("q", null) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.button
            key={chip.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={chip.onRemove}
            className="flex items-center gap-1.5 bg-navy/5 hover:bg-navy hover:text-cream text-navy text-[11px] tracking-[0.15em] uppercase rounded-full pl-3 pr-2 py-1.5 transition-colors capitalize"
          >
            {chip.label}
            <X size={12} />
          </motion.button>
        ))}
      </AnimatePresence>
      <button
        onClick={clearAll}
        className="text-[11px] tracking-[0.2em] uppercase text-ink/60 hover:text-navy underline underline-offset-4 ml-1"
      >
        Clear all
      </button>
    </div>
  );
}
