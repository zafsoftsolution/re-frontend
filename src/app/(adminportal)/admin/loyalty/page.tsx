"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award,
  Gift,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  djangoAdmin,
  type LoyaltyDashboardResponse,
  type LoyaltyTier,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import { cn, formatPrice } from "@/lib/utils";

const TIER_TONE: Record<LoyaltyTier, { bg: string; text: string }> = {
  bronze: { bg: "bg-amber-700/10", text: "text-amber-800" },
  silver: { bg: "bg-ink/10", text: "text-ink/80" },
  gold: { bg: "bg-amber-50", text: "text-amber-700" },
  platinum: { bg: "bg-indigo-50", text: "text-indigo-800" },
  obsidian: { bg: "bg-navy/10", text: "text-navy" },
};

const TIER_ORDER: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum", "obsidian"];

export default function LoyaltyOverviewPage() {
  const [data, setData] = useState<LoyaltyDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    djangoAdmin.loyalty
      .dashboard()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) {
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

  const totalCustomers = Object.values(data.tier_distribution).reduce(
    (s, n) => s + n,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Loyalty"
        title="Overview"
        description="House-list health at a glance — earning, redeeming, and tier distribution across your customer base."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/loyalty/rewards"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <Gift size={14} /> Manage rewards
            </Link>
            <Link
              href="/admin/loyalty/tiers"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <Award size={14} /> Tier config
            </Link>
          </div>
        }
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI
          label="Members"
          value={totalCustomers.toLocaleString()}
          icon={<Users size={16} />}
          hint="Across all tiers"
        />
        <KPI
          label="Points outstanding"
          value={data.points_outstanding.toLocaleString()}
          icon={<Sparkles size={16} />}
          hint="Redeemable balance held by customers"
        />
        <KPI
          label="Earned · 30d"
          value={`+${data.earned_30d.toLocaleString()}`}
          icon={<TrendingUp size={16} className="text-emerald-700" />}
        />
        <KPI
          label="Spent · 30d"
          value={`−${data.spent_30d.toLocaleString()}`}
          icon={<TrendingDown size={16} className="text-rose-700" />}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Tier distribution */}
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5">
          <header className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
              Tier distribution
            </h2>
            <span className="text-xs text-ink/55 tabular">
              {totalCustomers} customers
            </span>
          </header>
          <ul className="space-y-3">
            {TIER_ORDER.map((tier) => {
              const count = data.tier_distribution[tier] ?? 0;
              const pct = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;
              const tone = TIER_TONE[tier];
              return (
                <li key={tier}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 px-2 py-0.5 rounded-full ring-1 ring-inset text-[10px] tracking-[0.18em] uppercase font-medium",
                        tone.bg,
                        tone.text,
                      )}
                    >
                      {tier}
                    </span>
                    <span className="tabular text-ink/65">
                      <span className="text-navy font-medium">{count}</span>
                      <span className="text-ink/35"> · {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F4F5F7] overflow-hidden">
                    <div
                      className="h-full bg-navy/70 transition-[width] duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Top earners */}
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5">
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
              Top earners
            </h2>
            <Link
              href="/admin/loyalty/transactions"
              className="text-[11px] tracking-[0.18em] uppercase text-ink/55 hover:text-navy"
            >
              Activity →
            </Link>
          </header>
          {data.top_earners.length === 0 ? (
            <p className="text-sm text-ink/55 py-6 text-center">
              No customers with points yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--jmn-line)]">
              {data.top_earners.map((c) => {
                const tone = TIER_TONE[c.tier];
                return (
                  <li
                    key={c.user_id}
                    className="py-3 flex items-center gap-3"
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 grid place-items-center rounded-full ring-1 ring-inset text-[10px] tracking-[0.18em] uppercase font-medium",
                        tone.bg,
                        tone.text,
                      )}
                      aria-label={c.tier}
                    >
                      {c.tier.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy truncate">
                        {c.full_name || c.email}
                      </p>
                      <p className="text-[11px] text-ink/55 tabular truncate">
                        LTV {formatPrice(Number(c.lifetime_value), "BDT")}
                      </p>
                    </div>
                    <span className="font-medium text-navy tabular text-sm">
                      {c.points.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Bottom strip */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPI
          label="Active rewards"
          value={String(data.active_rewards)}
          hint="Live in the rewards catalog"
        />
        <KPI
          label="Redemptions · 30d"
          value={String(data.redemptions_30d)}
          hint="Coupons issued from points"
        />
        <KPI
          label="Net flow · 30d"
          value={(data.earned_30d - data.spent_30d).toLocaleString()}
          hint="Points earned minus spent"
        />
      </section>
    </>
  );
}

function KPI({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] tracking-[0.3em] uppercase text-ink/45">
          {label}
        </p>
        {icon && <span className="text-ink/45">{icon}</span>}
      </div>
      <p className="text-xl font-semibold text-navy tabular">{value}</p>
      {hint && (
        <p className="mt-1 text-[11px] text-ink/55 leading-snug">{hint}</p>
      )}
    </div>
  );
}
