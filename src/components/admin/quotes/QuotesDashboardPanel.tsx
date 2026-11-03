"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Inbox } from "lucide-react";
import type { QuoteStatsShape } from "@/lib/django-admin";
import { formatMoney, timeAgo } from "@/lib/admin/quotes";
import QuoteStatusPill from "./QuoteStatusPill";
import { cn } from "@/lib/utils";

export function formatResponseTime(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

/** Dashboard block: RFQ KPIs + the five newest quote requests. */
export default function QuotesDashboardPanel({ stats }: { stats: QuoteStatsShape }) {
  const [now] = useState(() => Date.now());
  const conv =
    stats.conversion_rate === null || stats.conversion_rate === undefined
      ? "—"
      : `${(stats.conversion_rate * 100).toFixed(1)}%`;

  const kpis: { label: string; value: string; hint?: string; alert?: boolean; href?: string }[] = [
    { label: "New this week", value: String(stats.new_last_7_days), href: "/admin/rfq?status=all" },
    {
      label: "Awaiting quote",
      value: String(stats.open),
      hint: `${stats.by_status?.new ?? 0} new · ${stats.by_status?.in_review ?? 0} in review`,
      alert: stats.open > 0,
      href: "/admin/rfq?status=new",
    },
    {
      label: "Quoted value",
      value: formatMoney(stats.quoted_value_total, stats.currency),
      hint: `${formatMoney(stats.open_quoted_value, stats.currency)} still open`,
    },
    {
      label: "Conversion rate",
      value: conv,
      hint: `${formatMoney(stats.converted_value, stats.currency)} converted`,
    },
    {
      label: "Avg. response",
      value: formatResponseTime(stats.avg_response_hours),
      hint: "request → quoted",
    },
  ];

  return (
    <section aria-labelledby="dash-quotes" className="bg-white border border-[var(--jmn-line)] re-rule">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--jmn-line)]">
        <div>
          <h2 id="dash-quotes" className="text-lg text-navy">Quotes</h2>
          <p className="text-[12px] text-ink/60">Quote-first sales — website requests and their outcome</p>
        </div>
        <Link href="/admin/rfq" className="text-[13px] font-medium text-re-blue-text hover:underline inline-flex items-center gap-1">
          Open inbox <ArrowUpRight size={13} aria-hidden />
        </Link>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-5 border-b border-[var(--jmn-line)]">
        {kpis.map((k) => {
          const body = (
            <>
              <dt className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink/60">{k.label}</dt>
              <dd className={cn("mt-1 tabular text-2xl leading-tight", k.alert ? "text-re-red-text font-semibold" : "text-navy")}>
                {k.value}
              </dd>
              {k.hint && <dd className="mt-0.5 text-[11px] text-ink/60 tabular">{k.hint}</dd>}
            </>
          );
          return (
            <div key={k.label} className="p-4 border-r border-b md:border-b-0 border-[var(--jmn-line)] last:border-r-0">
              {k.href ? (
                <Link href={k.href} className="block hover:bg-re-steel-50 -m-2 p-2">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </dl>

      {stats.newest.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink/60">
          <Inbox size={18} className="mx-auto mb-2 text-ink/40" aria-hidden />
          No quote requests yet.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--jmn-line)]" aria-label="Newest quote requests">
          {stats.newest.map((q) => (
            <li key={q.id}>
              <Link href={`/admin/rfq/${q.id}`} className="px-5 py-3 flex items-center gap-4 hover:bg-re-steel-50">
                <span className="part-no text-[13px] text-re-blue-text w-36 shrink-0 truncate">{q.reference}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-navy truncate">{q.company_name || q.contact_name || q.phone}</span>
                  <span className="block text-[11px] text-ink/60">
                    {timeAgo(q.created_at, now)} · {q.items_count} line{q.items_count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="hidden sm:block tabular text-sm text-navy w-32 text-right">
                  {q.quoted_total ? formatMoney(q.quoted_total, stats.currency) : "—"}
                </span>
                <QuoteStatusPill status={q.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
