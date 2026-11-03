"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, ShoppingBag } from "lucide-react";
import { storefront } from "@/lib/storefront";
import type { Order } from "@/types";
import { formatDate, formatPrice } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function OrderConfirmation({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order id provided.");
      return;
    }

    // Try the sessionStorage cache first — set by CheckoutFlow on placement
    // so guests see their confirmation instantly without another round-trip.
    try {
      const cached = sessionStorage.getItem(`jmn:order:${orderId}`);
      if (cached) {
        setOrder(JSON.parse(cached) as Order);
        return;
      }
    } catch {
      /* fall through to network fetch */
    }

    storefront.orders
      .get(orderId)
      .then(setOrder)
      .catch((e) => setError((e as Error).message));
  }, [orderId]);

  if (error) {
    return (
      <div className="shell pt-44 pb-32">
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 max-w-xl">
          {error}
        </div>
        <p className="text-sm text-ink/65 mt-4 max-w-xl">
          If you placed an order as a guest, you should have received a
          confirmation. Sign in if you have an account, or contact us with
          your order number.
        </p>
        <Link href="/account" className="btn-ghost text-navy border-navy/30 mt-6">
          <span>Go to account</span>
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="shell pt-44 pb-32 grid place-items-center">
        <Loader2 size={28} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="inline-flex h-16 w-16 grid place-items-center rounded-full bg-emerald-50 text-emerald-700 mb-6"
        >
          <CheckCircle2 size={28} />
        </motion.div>

        <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-4">
          /Order placed · {order.orderNumber}
        </p>

        <h1 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-tight text-navy max-w-3xl mx-auto">
          Thank you, <span className="italic">{order.shippingAddress.firstName}.</span>
        </h1>

        <p className="mt-5 max-w-md mx-auto text-ink/65 leading-relaxed">
          We’ve received your order and the atelier is on it. A confirmation
          will arrive at your email shortly.
        </p>
      </header>

      <section className="shell pb-32 grid lg:grid-cols-[1.4fr_1fr] gap-12 md:gap-20">
        {/* Left — items */}
        <div className="space-y-10">
          <Card title="Items">
            <ul className="divide-y divide-[var(--jmn-line)]">
              {order.items.map((it) => (
                <li
                  key={`${it.productId}-${it.size}-${it.color}`}
                  className="py-4 flex items-start gap-4"
                >
                  <div className="h-20 w-16 shrink-0 overflow-hidden bg-bone">
                    {it.productImage && (
                      <Image
                        src={it.productImage}
                        alt={it.productName}
                        width={64}
                        height={80}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base text-navy">
                      {it.productName}
                    </p>
                    <p className="text-[11px] tracking-[0.2em] uppercase text-ink/50 mt-1">
                      {it.color} · {it.size} · ×{it.quantity}
                    </p>
                    <p className="text-[10px] text-ink/45 tabular mt-1">
                      SKU {it.sku}
                    </p>
                  </div>
                  <span className="font-display text-base text-navy tabular shrink-0">
                    {formatPrice(it.total, order.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-[var(--jmn-line)] space-y-2 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
              {order.discount > 0 && (
                <Row
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`− ${formatPrice(order.discount, order.currency)}`}
                />
              )}
              <Row
                label="Shipping"
                value={
                  order.shipping === 0
                    ? "Free"
                    : formatPrice(order.shipping, order.currency)
                }
              />
              <Row label="Tax" value={formatPrice(order.tax, order.currency)} />
              <Row
                label="Total paid"
                value={formatPrice(order.total, order.currency)}
                bold
              />
            </div>
          </Card>

          <Card title="Shipping to">
            <AddressBlock address={order.shippingAddress} />
          </Card>
        </div>

        {/* Right — meta */}
        <aside className="space-y-6">
          <Card title="Order details">
            <dl className="text-sm space-y-3">
              <Detail label="Order number" value={order.orderNumber} />
              <Detail label="Placed" value={formatDate(order.createdAt)} />
              <Detail
                label="Payment"
                value={`${order.paymentMethod.replace(/_/g, " ")} · ${order.paymentStatus}`}
              />
              <Detail label="Status" value={order.status.replace(/_/g, " ")} />
            </dl>
          </Card>

          <div className="bg-navy text-cream p-6 md:p-8 rounded-[var(--radius-lg)]">
            <Mail size={18} className="text-gold mb-3" />
            <h3 className="font-display text-xl mb-2">A note from the atelier.</h3>
            <p className="text-sm text-cream/70 leading-relaxed">
              We’ll update you the moment your order ships. In the meantime,
              everything you need lives in your account.
            </p>
            <Link
              href="/account"
              className="mt-5 inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-gold hover:text-cream transition-colors"
            >
              View your orders →
            </Link>
          </div>

          <Link
            href="/products"
            className="btn-ghost text-navy border-navy/30 hover:border-navy w-full justify-center"
          >
            <ShoppingBag size={14} />
            <span>Continue shopping</span>
          </Link>
        </aside>
      </section>
    </>
  );
}

// ─── Bits ────────────────────────────────────────────────────────────────────

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-bone/40 border border-[var(--jmn-line)] p-6 md:p-8">
      <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-5">
        {title}
      </p>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        bold
          ? "pt-3 mt-2 border-t border-[var(--jmn-line)] text-navy font-medium text-base"
          : ""
      }`}
    >
      <span className="text-ink/60">{label}</span>
      <span className="tabular text-navy">{value}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[10px] tracking-[0.25em] uppercase text-ink/50">
        {label}
      </dt>
      <dd className="text-navy capitalize">{value}</dd>
    </div>
  );
}

function AddressBlock({
  address,
}: {
  address: Order["shippingAddress"];
}) {
  return (
    <div className="text-sm leading-relaxed text-ink/80">
      <p className="font-medium text-navy">
        {address.firstName} {address.lastName}
      </p>
      {address.company && <p>{address.company}</p>}
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>
        {address.city}
        {address.state ? `, ${address.state}` : ""} {address.postcode}
      </p>
      <p>{address.country}</p>
      {address.phone && (
        <p className="mt-2 text-ink/55">{address.phone}</p>
      )}
    </div>
  );
}
