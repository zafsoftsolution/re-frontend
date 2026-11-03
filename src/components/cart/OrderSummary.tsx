"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";

interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponApplied: boolean;
}

export default function OrderSummary() {
  const { items, couponCode, setCoupon } = useCart();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [code, setCode] = useState(couponCode ?? "");
  const [state, setState] = useState<"idle" | "loading" | "invalid" | "applied">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  // Sync coupon input if cleared externally
  useEffect(() => {
    setCode(couponCode ?? "");
    if (!couponCode) setState("idle");
  }, [couponCode]);

  // Recompute server-authoritative totals whenever cart or coupon changes
  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) {
      setTotals(null);
      return;
    }
    (async () => {
      try {
        const body = {
          items: items.map((i) => ({
            productId: i.productId,
            size: i.selectedSize,
            color: i.selectedColor,
            quantity: i.quantity,
          })),
          couponCode: couponCode ?? undefined,
        };
        const data = await api.post<Totals>("/cart/totals", body);
        if (!cancelled) setTotals(data);
      } catch {
        if (!cancelled) setTotals(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, couponCode]);

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setState("loading");
    setMsg(null);
    try {
      await api.get(`/coupons/${normalized}`);
      setCoupon(normalized);
      setState("applied");
      setMsg("Coupon applied.");
    } catch (err) {
      setState("invalid");
      setMsg(err instanceof Error ? err.message : "Invalid code");
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCode("");
    setState("idle");
    setMsg(null);
  }

  if (items.length === 0) return null;

  const display = totals ?? {
    subtotal: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    couponApplied: false,
  };

  return (
    <aside className="lg:sticky lg:top-28 border border-navy/10 bg-cream p-6 md:p-8 space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">Summary</p>
        <h2 className="font-display text-2xl md:text-3xl text-navy tracking-tight">
          Order <span className="italic">summary.</span>
        </h2>
      </div>

      {/* Coupon */}
      <form onSubmit={applyCoupon} className="space-y-2">
        <label className="text-[10px] tracking-[0.3em] uppercase text-ink/55">
          Promo code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="WELCOME10"
            disabled={state === "applied"}
            className="flex-1 bg-transparent border-b border-navy/20 focus:border-gold outline-none py-2.5 text-navy placeholder:text-ink/30 tracking-wider uppercase text-sm disabled:opacity-60"
          />
          {state === "applied" ? (
            <button
              type="button"
              onClick={removeCoupon}
              className="px-4 text-[11px] tracking-[0.2em] uppercase text-ink/60 hover:text-navy"
            >
              Remove
            </button>
          ) : (
            <button
              type="submit"
              disabled={state === "loading" || !code.trim()}
              className="px-5 text-[11px] tracking-[0.2em] uppercase text-navy border-b border-navy/40 hover:text-gold hover:border-gold disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {state === "loading" ? "..." : "Apply"}
            </button>
          )}
        </div>
        <AnimatePresence>
          {msg && (
            <motion.p
              key={msg}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-xs flex items-center gap-1.5 ${
                state === "applied" ? "text-gold" : "text-red-500"
              }`}
            >
              {state === "applied" && <BadgeCheck size={13} />}
              {msg}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      {/* Lines */}
      <dl className="space-y-3 text-sm pt-2 border-t border-navy/10">
        <Row label="Subtotal" value={formatPrice(display.subtotal)} />
        <AnimatePresence>
          {display.discount > 0 && (
            <motion.div
              key="discount"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Row
                label={`Discount${couponCode ? ` · ${couponCode}` : ""}`}
                value={`− ${formatPrice(display.discount)}`}
                tone="gold"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Row
          label="Shipping"
          value={display.shipping === 0 ? "Complimentary" : formatPrice(display.shipping)}
          tone={display.shipping === 0 ? "gold" : undefined}
        />
        <Row label="Estimated tax" value={formatPrice(display.tax)} />
      </dl>

      <div className="pt-4 border-t border-navy/10 flex items-end justify-between">
        <span className="text-[11px] tracking-[0.3em] uppercase text-ink/55">Total</span>
        <span className="font-display text-3xl text-navy tabular">
          {formatPrice(display.total)}
        </span>
      </div>

      <Link
        href="/checkout"
        className="btn-primary w-full justify-center"
      >
        Proceed to checkout
        <ArrowRight size={14} />
      </Link>

      {/* Reassurance */}
      <ul className="pt-4 space-y-2.5 text-xs text-ink/65 border-t border-navy/10">
        <Reassurance
          icon={<Truck size={13} />}
          text={`Free shipping over ${siteConfig.currency.symbol}${siteConfig.freeShippingThreshold}`}
        />
        <Reassurance icon={<RotateCcw size={13} />} text="30-day complimentary returns" />
        <Reassurance icon={<ShieldCheck size={13} />} text="Secure checkout · encrypted payments" />
      </ul>
    </aside>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink/65">{label}</dt>
      <dd className={`tabular ${tone === "gold" ? "text-gold font-medium" : "text-navy"}`}>
        {value}
      </dd>
    </div>
  );
}

function Reassurance({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="text-gold">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
