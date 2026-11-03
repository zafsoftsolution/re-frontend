"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-24 text-center"
      >
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
          No matches
        </p>
        <h3 className="font-display text-3xl md:text-4xl text-navy tracking-tight max-w-lg mx-auto">
          Nothing fits these filters <span className="italic">yet.</span>
        </h3>
        <p className="mt-4 max-w-md mx-auto text-ink/60">
          Try loosening a filter or two — or come back soon. We add pieces weekly.
        </p>
        <Link href="/products" className="btn-primary mt-10">
          Clear filters
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-14 md:gap-x-6 md:gap-y-20">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} priority={i < 4} />
      ))}
    </div>
  );
}
