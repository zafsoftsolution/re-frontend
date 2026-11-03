"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FAQ } from "@/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function FAQAccordion({ items }: { items: FAQ[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="border-t border-[var(--jmn-line)]">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="border-b border-[var(--jmn-line)]">
            <button
              onClick={() => setOpenId(open ? null : item.id)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-lg md:text-xl text-navy">
                {item.question}
              </span>
              <ChevronDown
                size={18}
                className={`text-navy/60 transition-transform shrink-0 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="pb-6 pr-8 text-sm md:text-base text-ink/75 leading-relaxed">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
