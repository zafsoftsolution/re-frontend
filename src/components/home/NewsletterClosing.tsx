"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { HomeBlock } from "@/lib/storefront";

interface Props {
  block?: HomeBlock | null;
}

export default function NewsletterClosing({ block }: Props = {}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  // Newsletter is admin-driven — no block, no section.
  if (!block) return null;

  const eyebrow = block.eyebrow || "";
  const subtitle = block.body || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErr(null);
    try {
      await api.post("/newsletter", { email, source: "home" });
      setState("done");
      setEmail("");
    } catch (e) {
      setState("error");
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <section className="relative bg-navy text-cream overflow-hidden py-32 md:py-48">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_120%,rgba(201,161,74,0.3),transparent_60%)]"
      />

      <div className="shell relative text-center">
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-[11px] tracking-[0.3em] uppercase text-gold mb-8"
          >
            {eyebrow}
          </motion.p>
        )}

        {(block.title || block.subtitle) && (
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] tracking-tight"
          >
            {block.title}
            {block.subtitle && (
              <>
                <br />
                <span className="italic text-gold">{block.subtitle}</span>
              </>
            )}
          </motion.h2>
        )}

        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-8 max-w-xl mx-auto text-cream/70 leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-12 max-w-lg mx-auto"
        >
          <div className="relative border-b border-cream/30 focus-within:border-gold transition-colors">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-4 pr-12 text-cream placeholder:text-cream/40 outline-none text-lg"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              aria-label="Subscribe"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full hover:bg-gold hover:text-navy transition-colors disabled:opacity-50"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          {state === "done" && (
            <p className="mt-4 text-gold text-sm">Welcome to the house. Check your inbox.</p>
          )}
          {state === "error" && <p className="mt-4 text-red-300 text-sm">{err}</p>}
          <p className="mt-6 text-[10px] tracking-[0.3em] uppercase text-cream/40">
            One note a fortnight · unsubscribe anytime
          </p>
        </motion.form>
      </div>
    </section>
  );
}
