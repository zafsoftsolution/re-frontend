"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Box, Download, Loader2, ShoppingBag } from "lucide-react";
import { djangoAdmin, type DashboardStatsResponse } from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import { formatPrice, formatDate } from "@/lib/utils";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import SalesChart from "@/components/admin/SalesChart";
import StatusPill from "@/components/admin/StatusPill";
import EmptyState from "@/components/admin/EmptyState";
import QuotesDashboardPanel from "@/components/admin/quotes/QuotesDashboardPanel";
import type { QuoteStatsShape } from "@/lib/django-admin";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Older backends don't embed `quotes` in the dashboard payload — fall
  // back to GET /site/rfq/stats/.
  const [quoteStats, setQuoteStats] = useState<QuoteStatsShape | null>(null);
  const toast = useToast();

  useEffect(() => {
    djangoAdmin.dashboard
      .stats()
      .then((s) => {
        setStats(s);
        if (s.quotes) setQuoteStats(s.quotes);
        else djangoAdmin.rfq.stats().then(setQuoteStats).catch(() => {});
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  const spark = stats.salesByDay.map((d) => d.sales);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Quotes, orders and stock at a glance — last 14 days."
        actions={
          <button
            type="button"
            onClick={() => {
              try {
                const file = downloadDashboardCsv(stats);
                toast.success("Exported", file);
              } catch (e) {
                toast.error("Couldn't export", (e as Error).message);
              }
            }}
            className="h-9 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep transition-colors inline-flex items-center gap-2"
          >
            <Download size={13} />
            Export report
          </button>
        }
      />

      {quoteStats && <QuotesDashboardPanel stats={quoteStats} />}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Revenue"
          value={formatPrice(stats.revenue.current, stats.revenue.currency)}
          delta={stats.revenue.delta}
          spark={spark}
        />
        <StatCard
          label="Orders"
          value={stats.orders.current.toLocaleString()}
          delta={stats.orders.delta}
          spark={stats.salesByDay.map((d) => d.orders)}
        />
        <StatCard
          label="Customers"
          value={stats.customers.current.toLocaleString()}
          delta={stats.customers.delta}
        />
        <StatCard
          label="Avg. order"
          value={formatPrice(stats.avgOrderValue.current, stats.avgOrderValue.currency)}
          delta={stats.avgOrderValue.delta}
        />
        <StatCard
          label="Conversion"
          value={`${stats.conversionRate.current.toFixed(1)}%`}
          delta={stats.conversionRate.delta}
        />
      </div>

      {/* Chart + Traffic */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <Card title="Sales" subtitle="Revenue by day · last 14 days">
          <SalesChart data={stats.salesByDay} currency={stats.revenue.currency} />
        </Card>

        <Card title="Traffic sources" subtitle="Last 30 days">
          <ul className="space-y-4">
            {stats.trafficSources.map((s) => (
              <li key={s.source}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy">{s.source}</span>
                  <span className="tabular text-ink/55">
                    {s.visits.toLocaleString()}
                    <span className="ml-2 text-ink/35">{s.share}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden">
                  <div
                    className="h-full bg-re-ink"
                    style={{ width: `${s.share}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent orders + Top products + Low stock */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card
          title="Recent orders"
          subtitle="Latest customer activity"
          action={
            <Link
              href="/admin/orders"
              className="text-[11px] tracking-[0.2em] uppercase text-navy hover:text-gold transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          }
        >
          {stats.recentOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={18} />}
              title="No recent orders."
              description="Orders placed in the storefront will appear here in real time."
            />
          ) : (
            <ul className="divide-y divide-[var(--jmn-line)]">
              {stats.recentOrders.slice(0, 6).map((o) => (
                <li key={o.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-navy text-sm">{o.orderNumber}</p>
                    <p className="text-xs text-ink/55">
                      {formatDate(o.createdAt)} · {o.items.length} items
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm tabular text-navy">
                      {formatPrice(o.total, o.currency)}
                    </p>
                    <StatusPill status={o.status} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title="Top products"
            subtitle="Best sellers"
            action={
              <Link
                href="/admin/products"
                className="text-[11px] tracking-[0.2em] uppercase text-navy hover:text-gold transition-colors flex items-center gap-1"
              >
                Catalog <ArrowUpRight size={12} />
              </Link>
            }
          >
            {stats.topProducts.length === 0 ? (
              <EmptyState
                icon={<Box size={18} />}
                title="No products yet."
              />
            ) : (
              <ul className="space-y-3">
                {stats.topProducts.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-navy truncate">{p.name}</span>
                    <span className="tabular text-sm text-ink/55 shrink-0">
                      {formatPrice(p.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Low stock" subtitle="Action recommended" tone="warning">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-ink/55">All products are well stocked.</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.lowStockProducts.slice(0, 5).map((p) => {
                  const total = p.sizes.reduce((s, z) => s + z.stock, 0);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-navy truncate">{p.name}</span>
                      <span className="tabular text-xs text-rose-700 shrink-0">
                        {total} left
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  action,
  tone = "default",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  tone?: "default" | "warning";
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-6">
      <header className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            {tone === "warning" && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            )}
            <h2 className="text-sm font-medium text-navy">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-[11px] text-ink/45 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

// ── Dashboard report download ───────────────────────────────────────────────

/**
 * Build a multi-section dashboard CSV from the stats already in memory and
 * trigger a browser download. Stays client-side because the data is tiny and
 * already loaded — saving us a server round-trip on click.
 *
 * Layout (each section is a labelled block separated by a blank row):
 *   KPI SUMMARY              one row per metric (current, delta %, trend)
 *   SALES BY DAY             one row per day in the window
 *   RECENT ORDERS            last 6 orders the dashboard showed
 *   TOP PRODUCTS             best sellers in the window
 *   LOW-STOCK PRODUCTS       inventory needing attention
 *
 * Returns the filename so the caller can toast it.
 */
function downloadDashboardCsv(stats: DashboardStatsResponse): string {
  // Quote any field that contains a comma, quote, or newline — RFC-4180.
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cells: unknown[]) => cells.map(esc).join(",");

  const lines: string[] = [];
  const now = new Date();
  lines.push(row("Dashboard report"));
  lines.push(row("Generated", now.toISOString()));
  lines.push(row("Currency", stats.revenue.currency));
  lines.push("");

  // KPI SUMMARY ──────────────────────────────────────────────────────────────
  lines.push(row("KPI SUMMARY"));
  lines.push(row("Metric", "Current", "Delta %", "Trend", "Label"));
  const kpi = [
    { label: "Revenue", k: stats.revenue, money: true },
    { label: "Orders", k: stats.orders, money: false },
    { label: "Customers", k: stats.customers, money: false },
    { label: "Avg order value", k: stats.avgOrderValue, money: true },
    { label: "Conversion rate", k: stats.conversionRate, money: false },
  ];
  for (const { label, k } of kpi) {
    lines.push(row(
      label,
      k.current,
      k.delta.value,
      k.delta.trend,
      k.delta.label,
    ));
  }
  lines.push("");

  // SALES BY DAY ─────────────────────────────────────────────────────────────
  if (stats.salesByDay.length) {
    lines.push(row("SALES BY DAY"));
    lines.push(row("Date", "Revenue", "Orders"));
    for (const d of stats.salesByDay) {
      lines.push(row(d.date, d.sales, d.orders));
    }
    lines.push("");
  }

  // RECENT ORDERS ────────────────────────────────────────────────────────────
  if (stats.recentOrders.length) {
    lines.push(row("RECENT ORDERS"));
    lines.push(row(
      "Order #", "Status", "Payment status", "Total", "Currency",
      "Items", "Placed", "Updated",
    ));
    for (const o of stats.recentOrders) {
      lines.push(row(
        o.orderNumber,
        o.status,
        o.paymentStatus,
        o.total,
        o.currency,
        o.items.length,
        o.createdAt,
        o.updatedAt,
      ));
    }
    lines.push("");
  }

  // TOP PRODUCTS ─────────────────────────────────────────────────────────────
  if (stats.topProducts.length) {
    lines.push(row("TOP PRODUCTS"));
    lines.push(row("Name", "SKU", "Price", "Currency", "Rating", "Reviews"));
    for (const p of stats.topProducts) {
      lines.push(row(
        p.name, p.sku, p.price, p.currency, p.rating, p.reviewCount,
      ));
    }
    lines.push("");
  }

  // LOW-STOCK PRODUCTS ───────────────────────────────────────────────────────
  if (stats.lowStockProducts.length) {
    lines.push(row("LOW-STOCK PRODUCTS"));
    lines.push(row("Name", "SKU", "Price", "Currency", "Rating", "Reviews"));
    for (const p of stats.lowStockProducts) {
      lines.push(row(
        p.name, p.sku, p.price, p.currency, p.rating, p.reviewCount,
      ));
    }
    lines.push("");
  }

  // UTF-8 BOM so Excel on Windows reads ৳ / Bangla glyphs correctly.
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const filename = `dashboard-${now.toISOString().slice(0, 10)}.csv`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return filename;
}
