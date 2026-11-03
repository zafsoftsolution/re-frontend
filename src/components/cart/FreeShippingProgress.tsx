"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Props {
  subtotal: number;
  threshold: number;
  remaining: number;
  hasFreeShipping: boolean;
  tone?: "light" | "dark";
}

export default function FreeShippingProgress({
  subtotal,
  threshold,
  remaining,
  hasFreeShipping,
  tone = "light",
}: Props) {
  const progress = Math.min(100, (subtotal / threshold) * 100);
  const isDark = tone === "dark";

  return (
    <div
      className={`px-5 py-4 ${
        isDark ? "bg-navy text-cream" : "bg-bone text-navy"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase mb-2.5">
        {hasFreeShipping ? (
          <>
            <Sparkles size={13} className="text-gold" />
            <span>Complimentary shipping unlocked</span>
          </>
        ) : (
          <>
            <span className={isDark ? "text-cream/60" : "text-ink/50"}>
              {formatPrice(remaining)} away from
            </span>
            <span className="text-gold">free shipping</span>
          </>
        )}
      </div>
      <div
        className={`relative h-1 rounded-full overflow-hidden ${
          isDark ? "bg-cream/15" : "bg-navy/10"
        }`}
      >
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 bg-gold rounded-full"
        />
      </div>
    </div>
  );
}
