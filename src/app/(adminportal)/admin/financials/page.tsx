"use client";

/**
 * Profit & Loss / Revenue analytics.
 *
 * Single-page snapshot of the operator's financial health:
 *   - KPI strip (revenue, COGS, gross profit, gross margin, purchasing spend,
 *     net profit) with vs-prev-period deltas
 *   - Combined chart: revenue / COGS / profit over the selected window
 *   - Tabbed top-product lists: by revenue, by profit, by units, AND losses
 *     (products that sold below cost)
 *   - Quality-of-data hint when any sold line has no cost on file
 *
 * Data shape comes from `/api/inventory/financials/?days=N` —
 * see backend `inventory/financials.py`.
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock,
  Loader2,
  Minus,
  Package,
  PiggyBank,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import {
  djangoAdmin,
  type FinancialsProductRow,
  type FinancialsResponse,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import { cn, formatPrice } from "@/lib/utils";

const PERIODS: Array<{ label: string; days: number }> = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

type TopTab = "byRevenue" | "byProfit" | "byUnits" | "losses";

const TAB_LABEL: Record<TopTab, string> = {
  byRevenue: "Top by revenue",
  byProfit: "Top by profit",
  byUnits: "Top by units",
  losses: "Loss makers",
};

const TAB_ICON: Record<TopTab, React.ComponentType<{ size?: number; className?: string }>> = {
  byRevenue: Banknote,
  byProfit: TrendingUp,
  byUnits: Package,
  losses: TrendingDown,
};

export default function FinancialsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TopTab>("byRevenue");

  async function load() {
    setError(null);
    try {
      const res = await djangoAdmin.financials.summary(days);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (error && !data) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  const k = data.kpis;
  const currency = data.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales · Analytics"
        title="Profit &amp; Loss"
        description="Revenue, cost of goods, gross profit, and supplier spend — over the selected period."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-[#FAFAFA] rounded-md p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  className={cn(
                    "px-3 h-8 rounded text-[11px] tracking-[0.18em] uppercase transition-colors",
                    days === p.days
                      ? "bg-white text-navy shadow-sm"
                      : "text-ink/55 hover:text-navy",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Data-quality nag: visible only when sold lines have no cost on file. */}
      {k.unknownCostLines > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 leading-relaxed">
            <p className="font-medium">
              {k.unknownCostLines} sold line{k.unknownCostLines === 1 ? "" : "s"} have
              no cost on file.
            </p>
            <p className="text-[12px] opacity-80 mt-0.5">
              These rows are treated as zero-cost, which inflates the margin.
              Open <span className="font-semibold">Catalog → Products</span>{" "}
              and fill in <span className="tabular">Cost price</span> so future
              orders snapshot it correctly.
            </p>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={<Banknote size={14} />}
          label="Revenue"
          value={formatPrice(k.revenue.current, currency)}
          delta={k.revenue.delta}
          tone="navy"
        />
        <Kpi
          icon={<Wallet size={14} />}
          label="Cost of goods"
          value={formatPrice(k.cogs.current, currency)}
          delta={k.cogs.delta}
          invertDelta
        />
        <Kpi
          icon={<TrendingUp size={14} />}
          label="Gross profit"
          value={formatPrice(k.grossProfit.current, currency)}
          delta={k.grossProfit.delta}
          tone={k.grossProfit.current >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          icon={<Target size={14} />}
          label="Gross margin"
          value={`${k.grossMarginPct.current.toFixed(1)}%`}
        />
        <Kpi
          icon={<PiggyBank size={14} />}
          label="Supplier spend"
          value={formatPrice(k.purchasingSpend.current, currency)}
          delta={k.purchasingSpend.delta}
          invertDelta
        />
        <Kpi
          icon={<TrendingUp size={14} />}
          label="Net profit"
          value={formatPrice(k.netProfit.current, currency)}
          delta={k.netProfit.delta}
          tone={k.netProfit.current >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          icon={<Package size={14} />}
          label="Paid orders"
          value={String(k.paidOrders.current)}
          delta={k.paidOrders.delta}
        />
        <Kpi
          icon={<Clock size={14} />}
          label="Owed to suppliers"
          value={formatPrice(k.openSupplierBalance, currency)}
          tone="amber"
        />
      </section>

      {/* Returns strip — exposes the gross-vs-net story so it's obvious how
          much money flowed back out the door this period. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={<Banknote size={14} />}
          label="Gross revenue"
          value={formatPrice(k.grossRevenue.current, currency)}
          delta={k.grossRevenue.delta}
        />
        <Kpi
          icon={<TrendingDown size={14} />}
          label="Sales returns"
          value={formatPrice(k.salesReturns.current, currency)}
          delta={k.salesReturns.delta}
          invertDelta
          tone={k.salesReturns.current > 0 ? "rose" : "ink"}
        />
        <Kpi
          icon={<Undo2 size={14} />}
          label="Supplier credits"
          value={formatPrice(k.purchaseReturns.current, currency)}
          delta={k.purchaseReturns.delta}
          tone={k.purchaseReturns.current > 0 ? "emerald" : "ink"}
        />
        <Kpi
          icon={<Target size={14} />}
          label="Return rate"
          value={
            k.grossRevenue.current > 0
              ? `${((k.salesReturns.current / k.grossRevenue.current) * 100).toFixed(1)}%`
              : "0.0%"
          }
        />
      </section>

      {/* Combined chart: revenue / cogs / profit over the window. */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
              Daily breakdown
            </h2>
            <p className="text-sm text-ink/65 mt-0.5">
              {data.period.days} days · {currency}
            </p>
          </div>
          <Legend />
        </header>
        <ProfitChart data={data.timeseries} />
      </section>

      {/* Top product tables */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg">
        <header className="px-5 py-3 border-b border-[var(--jmn-line)] flex flex-wrap items-center gap-2">
          {(Object.keys(TAB_LABEL) as TopTab[]).map((t) => {
            const Icon = TAB_ICON[t];
            const count = data.topProducts[t].length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 h-8 rounded text-[11px] tracking-[0.18em] uppercase transition-colors flex items-center gap-1.5",
                  tab === t
                    ? "bg-navy/5 text-navy"
                    : "text-ink/55 hover:text-navy",
                )}
              >
                <Icon size={12} />
                {TAB_LABEL[t]}
                <span className="text-[10px] text-ink/40 tabular ml-0.5">
                  {count}
                </span>
              </button>
            );
          })}
        </header>
        <ProductTable
          rows={data.topProducts[tab]}
          currency={currency}
          variant={tab}
        />
      </section>
    </div>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────

function Kpi({
  icon,
  label,
  value,
  delta,
  tone = "ink",
  invertDelta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: { value: number; trend: "up" | "down" | "flat" };
  /** For "cost" metrics, a positive delta is bad — invert the colour. */
  invertDelta?: boolean;
  tone?: "navy" | "emerald" | "rose" | "amber" | "ink";
}) {
  const toneClass =
    tone === "navy"
      ? "text-navy"
      : tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
      ? "text-rose-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-navy";

  let deltaUI: React.ReactNode = null;
  if (delta) {
    const goodWhenUp = !invertDelta;
    const good =
      delta.trend === "flat"
        ? null
        : goodWhenUp
        ? delta.trend === "up"
        : delta.trend === "down";
    const color =
      good === null
        ? "text-ink/45"
        : good
        ? "text-emerald-700"
        : "text-rose-700";
    const arrow =
      delta.trend === "up" ? (
        <ArrowUpRight size={11} />
      ) : delta.trend === "down" ? (
        <ArrowDownRight size={11} />
      ) : (
        <Minus size={11} />
      );
    deltaUI = (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] tracking-[0.18em] uppercase tabular",
          color,
        )}
      >
        {arrow}
        {Math.abs(delta.value)}%
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--jmn-line)] bg-white p-4">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-ink/55">
        {icon}
        {label}
      </div>
      <p className={cn("font-display text-2xl tabular mt-2", toneClass)}>
        {value}
      </p>
      {deltaUI && <div className="mt-1">{deltaUI}</div>}
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  const series: Array<{ label: string; color: string }> = [
    { label: "Revenue", color: "#0E1A3A" },
    { label: "COGS", color: "#B68A4E" },
    { label: "Profit", color: "#047857" },
  ];
  return (
    <div className="flex items-center gap-3">
      {series.map((s) => (
        <span
          key={s.label}
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-ink/65"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: s.color }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ── Chart ───────────────────────────────────────────────────────────────────

function ProfitChart({
  data,
  height = 240,
}: {
  data: FinancialsResponse["timeseries"];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const computed = useMemo(() => {
    const w = 1000;
    const h = height;
    const pad = 32;
    if (data.length === 0) return null;
    const all = data.flatMap((d) => [d.revenue, d.cogs, d.profit]);
    const max = Math.max(0, ...all);
    const min = Math.min(0, ...all);
    const range = max - min || 1;
    const stepX = (w - pad * 2) / Math.max(1, data.length - 1);

    const y = (val: number) =>
      pad + (h - pad * 2) - ((val - min) / range) * (h - pad * 2);

    const series = (key: "revenue" | "cogs" | "profit") =>
      data.map((d, i) => ({ x: pad + i * stepX, y: y(d[key]), v: d[key], date: d.date }));

    const revenue = series("revenue");
    const cogs = series("cogs");
    const profit = series("profit");

    const path = (pts: typeof revenue) =>
      pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");

    const zeroY = y(0);

    return {
      w, h, pad, max, min, stepX,
      revenue, cogs, profit,
      paths: { revenue: path(revenue), cogs: path(cogs), profit: path(profit) },
      zeroY,
    };
  }, [data, height]);

  if (!computed) {
    return (
      <div className="h-[200px] grid place-items-center text-ink/40 text-sm">
        No data in this range
      </div>
    );
  }
  const { w, h, pad, max, min, stepX, revenue, cogs, profit, paths, zeroY } =
    computed;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        className="overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        {/* Y-axis labels */}
        <g className="text-[10px] fill-ink/45" style={{ fontFamily: "inherit" }}>
          {[1, 0.5, 0].map((t) => {
            const v = min + (max - min) * t;
            const y = pad + (h - pad * 2) * (1 - t);
            return (
              <g key={t}>
                <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="#E5E2DA" strokeDasharray="3 3" />
                <text x={4} y={y + 3} fontSize={10}>
                  {Math.round(v).toLocaleString()}
                </text>
              </g>
            );
          })}
        </g>

        {/* Zero line — bold when profit dips negative. */}
        {min < 0 && (
          <line
            x1={pad}
            x2={w - pad}
            y1={zeroY}
            y2={zeroY}
            stroke="#0A0A0A"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
        )}

        {/* Series */}
        <path d={paths.cogs} stroke="#B68A4E" strokeWidth="1.6" fill="none" />
        <path d={paths.revenue} stroke="#0E1A3A" strokeWidth="2" fill="none" />
        <path d={paths.profit} stroke="#047857" strokeWidth="1.8" fill="none" strokeDasharray="0" />

        {/* Hover hit-zones */}
        {revenue.map((p, i) => (
          <rect
            key={i}
            x={p.x - stepX / 2}
            y={pad}
            width={stepX}
            height={h - pad * 2}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* Hover markers */}
        {hover != null && (
          <g>
            <line
              x1={revenue[hover].x}
              x2={revenue[hover].x}
              y1={pad}
              y2={h - pad}
              stroke="#0E1A3A"
              strokeOpacity="0.25"
              strokeDasharray="2 3"
            />
            {[revenue, cogs, profit].map((s, idx) => (
              <circle
                key={idx}
                cx={s[hover].x}
                cy={s[hover].y}
                r="3.5"
                fill={["#0E1A3A", "#B68A4E", "#047857"][idx]}
                stroke="white"
                strokeWidth="1.5"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Tooltip overlay */}
      {hover != null && (
        <div
          className="absolute pointer-events-none bg-navy text-cream text-[11px] rounded-md px-3 py-2 shadow-lg leading-snug"
          style={{
            left: `${(revenue[hover].x / w) * 100}%`,
            top: 8,
            transform: "translateX(-50%)",
          }}
        >
          <p className="opacity-70 tabular mb-1">{revenue[hover].date}</p>
          <p>
            Revenue <span className="tabular">{revenue[hover].v.toLocaleString()}</span>
          </p>
          <p>
            COGS <span className="tabular">{cogs[hover].v.toLocaleString()}</span>
          </p>
          <p>
            Profit{" "}
            <span
              className={cn(
                "tabular font-medium",
                profit[hover].v < 0 ? "text-rose-300" : "text-emerald-300",
              )}
            >
              {profit[hover].v.toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Product table ──────────────────────────────────────────────────────────

function ProductTable({
  rows,
  currency,
  variant,
}: {
  rows: FinancialsProductRow[];
  currency: string;
  variant: TopTab;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <Package size={20} className="mx-auto text-ink/30 mb-2" />
        <p className="text-sm text-ink/55">
          {variant === "losses"
            ? "Nothing sold below cost in this window. Good work."
            : "No data for this period."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
          <tr>
            <th className="text-left font-medium pl-5 pr-2 py-3">Product</th>
            <th className="text-right font-medium px-2 py-3">Units</th>
            <th className="text-right font-medium px-2 py-3">Revenue</th>
            <th className="text-right font-medium px-2 py-3">COGS</th>
            <th className="text-right font-medium px-2 py-3">Profit</th>
            <th className="text-right font-medium pl-2 pr-5 py-3">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const profitNum = Number(r.profit);
            const profitTone =
              profitNum < 0
                ? "text-rose-700"
                : profitNum > 0
                ? "text-emerald-700"
                : "text-ink/55";
            const marginTone =
              r.margin_pct < 0
                ? "text-rose-700"
                : r.margin_pct < 15
                ? "text-amber-700"
                : "text-emerald-700";
            return (
              <tr
                key={r.product}
                className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] transition-colors"
              >
                <td className="pl-5 pr-2 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded bg-[#F4F5F7] overflow-hidden grid place-items-center">
                      {r.image ? (
                        <Image
                          src={r.image}
                          alt=""
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Package size={14} className="text-ink/30" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-navy truncate">{r.name}</p>
                      <p className="text-[11px] text-ink/45 tabular truncate">
                        {r.sku}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right tabular text-ink/80">
                  {r.units}
                </td>
                <td className="px-2 py-2.5 text-right tabular text-navy">
                  {formatPrice(Number(r.revenue), currency)}
                </td>
                <td className="px-2 py-2.5 text-right tabular text-ink/65">
                  {formatPrice(Number(r.cogs), currency)}
                </td>
                <td
                  className={cn(
                    "px-2 py-2.5 text-right tabular font-medium",
                    profitTone,
                  )}
                >
                  {formatPrice(profitNum, currency)}
                </td>
                <td
                  className={cn(
                    "pl-2 pr-5 py-2.5 text-right tabular font-medium",
                    marginTone,
                  )}
                >
                  {r.margin_pct.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
