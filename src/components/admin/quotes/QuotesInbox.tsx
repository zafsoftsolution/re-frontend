"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MessageCircle,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  djangoAdmin,
  type PaginatedResponse,
  type QuoteShape,
  type QuoteStatsShape,
  type QuoteStatus,
} from "@/lib/django-admin";
import {
  PREFERRED_CONTACT_LABEL,
  QUOTE_STATUS_LABEL,
  formatDateTime,
  formatDay,
  formatMoney,
  telLink,
  timeAgo,
  whatsappLink,
} from "@/lib/admin/quotes";
import { QUOTES_CHANGED_EVENT } from "@/lib/admin/use-quote-count";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import QuoteStatusPill from "./QuoteStatusPill";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25; // backend PageNumberPagination default

type Tab = "all" | "open" | QuoteStatus;
const TABS: { key: Tab; label: string; statuses?: QuoteStatus[] }[] = [
  { key: "new", label: "New" },
  { key: "in_review", label: "In review" },
  { key: "quoted", label: "Quoted" },
  { key: "accepted", label: "Accepted" },
  { key: "converted", label: "Converted" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

type Period = "any" | "today" | "7d" | "30d";
const PERIOD_MS: Record<Exclude<Period, "any">, number> = {
  today: 0,
  "7d": 7 * 86400000,
  "30d": 30 * 86400000,
};

function isTab(v: string | null): v is Tab {
  return !!v && TABS.some((t) => t.key === v);
}

export default function QuotesInbox() {
  const router = useRouter();
  const params = useSearchParams();
  const initialSearch = params.get("search") ?? "";
  const initialStatus = params.get("status");

  const [tab, setTab] = useState<Tab>(
    isTab(initialStatus) ? initialStatus : initialSearch ? "all" : "new",
  );
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [contact, setContact] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [period, setPeriod] = useState<Period>("any");
  const [page, setPage] = useState(1);
  const [reloadTick, setReloadTick] = useState(0);
  const [now] = useState(() => Date.now());

  const [stats, setStats] = useState<QuoteStatsShape | null>(null);
  const [result, setResult] = useState<{
    key: string;
    data?: PaginatedResponse<QuoteShape>;
    error?: string;
  } | null>(null);

  // Debounce the search box → `search`.
  useEffect(() => {
    const next = searchInput.trim();
    const t = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const key = listKey(tab, search, contact, ordering, page, reloadTick);

  useEffect(() => {
    let cancelled = false;
    const key = listKey(tab, search, contact, ordering, page, reloadTick);
    djangoAdmin.rfq
      .list({
        status: tab === "all" ? undefined : tab,
        preferred_contact: contact || undefined,
        search: search || undefined,
        ordering,
        page,
      })
      .then(
        (data) => !cancelled && setResult({ key, data }),
        (e: Error) => !cancelled && setResult({ key, error: e.message }),
      );
    return () => {
      cancelled = true;
    };
  }, [tab, search, contact, ordering, page, reloadTick]);

  // Tab counts — refreshed with the list.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      djangoAdmin.rfq.stats().then(
        (s) => !cancelled && setStats(s),
        () => {},
      );
    load();
    window.addEventListener(QUOTES_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(QUOTES_CHANGED_EVENT, load);
    };
  }, [reloadTick]);

  const loading = result?.key !== key;
  const data = result?.data;
  const error = result?.key === key ? result.error : undefined;

  const rows = useMemo(() => {
    const list = data?.results ?? [];
    if (period === "any") return list;
    const since =
      period === "today"
        ? new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()
        : now - PERIOD_MS[period];
    return list.filter((q) => new Date(q.created_at).getTime() >= since);
  }, [data, period, now]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  const countFor = (t: Tab): number | null => {
    if (!stats) return null;
    if (t === "all") return stats.total;
    if (t === "open") return stats.open;
    return stats.by_status?.[t] ?? 0;
  };

  const selectTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales · Quote-first"
        title="Quotes"
        description="Every quote request from the website. Review the lines, price them, send the quotation, then convert accepted quotes into orders."
        actions={
          <button
            type="button"
            onClick={() => setReloadTick((n) => n + 1)}
            className="h-10 px-3 inline-flex items-center gap-2 border border-[var(--jmn-line)] bg-white text-[12px] font-medium text-navy hover:border-navy/40"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} aria-hidden />
            Refresh
          </button>
        }
      />

      {/* KPI strip */}
      {stats && (
        <dl className="grid grid-cols-2 md:grid-cols-4 border border-[var(--jmn-line)] bg-white mb-6">
          <Kpi label="Awaiting quote" value={String(stats.open)} accent={stats.open > 0} />
          <Kpi label="New · last 7 days" value={String(stats.new_last_7_days)} />
          <Kpi label="Open quoted value" value={formatMoney(stats.open_quoted_value, stats.currency)} />
          <Kpi label="Expiring in 3 days" value={String(stats.expiring_soon)} />
        </dl>
      )}

      {/* Status tabs */}
      <div
        role="tablist"
        aria-label="Quote status"
        className="flex gap-0 overflow-x-auto no-scrollbar border-b border-[var(--jmn-line)] mb-4"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const n = countFor(t.key);
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.key)}
              className={cn(
                "relative shrink-0 h-11 px-4 text-[13px] font-medium inline-flex items-center gap-2 transition-colors duration-150",
                active ? "text-navy" : "text-ink/60 hover:text-navy",
              )}
            >
              {t.label}
              {n !== null && (
                <span
                  className={cn(
                    "tabular text-[11px] px-1.5 min-w-5 text-center",
                    t.key === "new" && n > 0
                      ? "bg-re-red-cta text-white"
                      : "bg-re-steel-100 text-ink/65",
                  )}
                >
                  {n}
                </span>
              )}
              {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-re-red" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="relative flex-1 min-w-[220px] max-w-md">
          <span className="sr-only">Search quotes</span>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/55" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Reference, company, contact, phone, email or BIN"
            className="w-full h-10 pl-9 pr-3 bg-white border border-[var(--jmn-line)] text-sm focus:border-re-blue outline-none"
          />
        </label>
        <Select
          label="Preferred contact"
          value={contact}
          onChange={(v) => {
            setContact(v);
            setPage(1);
          }}
          options={[
            ["", "Any contact"],
            ["whatsapp", "WhatsApp"],
            ["call", "Phone call"],
            ["email", "Email"],
          ]}
        />
        <Select
          label="Received"
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={[
            ["any", "Any date"],
            ["today", "Today"],
            ["7d", "Last 7 days"],
            ["30d", "Last 30 days"],
          ]}
        />
        <Select
          label="Sort"
          value={ordering}
          onChange={(v) => {
            setOrdering(v);
            setPage(1);
          }}
          options={[
            ["-created_at", "Newest first"],
            ["created_at", "Oldest first"],
            ["status", "Status"],
          ]}
        />
      </div>

      <div className="bg-white border border-[var(--jmn-line)]">
        {error ? (
          <div className="p-6 text-sm text-rose-700" role="alert">
            Couldn&apos;t load quotes: {error}
          </div>
        ) : !data && loading ? (
          <div className="p-10 grid place-items-center text-ink/55">
            <Loader2 className="animate-spin" size={20} aria-label="Loading" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} />}
            title={search ? `No quotes match “${search}”` : `No ${tab === "all" ? "" : QUOTE_STATUS_LABEL[tab as QuoteStatus]?.toLowerCase() + " "}quotes`}
            description={
              tab === "new"
                ? "New requests from the website land here. You'll also get a notification."
                : "Try another status tab or clear the filters."
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn("hidden md:block overflow-x-auto", loading && "opacity-60")}>
              <table className="w-full text-sm" data-testid="quotes-table">
                <thead>
                  <tr className="text-left text-[10px] tracking-[0.16em] uppercase text-ink/60 border-b border-[var(--jmn-line)] bg-re-steel-50">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Reference</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Received</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Customer</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Contact</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold text-right">Lines</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold text-right">Quoted</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Valid until</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => router.push(`/admin/rfq/${q.id}`)}
                      className={cn(
                        "border-b border-[var(--jmn-line)] last:border-0 hover:bg-re-steel-50 cursor-pointer",
                        q.status === "new" && "font-medium",
                      )}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/admin/rfq/${q.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="part-no text-re-blue-text hover:underline"
                        >
                          {q.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" title={formatDateTime(q.created_at)}>
                        <span className="text-navy">{timeAgo(q.created_at, now)}</span>
                        <span className="block text-[11px] text-ink/55">{formatDay(q.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <span className="block truncate text-navy">
                          {q.company_name || q.contact_name || "—"}
                        </span>
                        {q.company_name && q.contact_name && (
                          <span className="block truncate text-[12px] text-ink/55">{q.contact_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="part-no text-[13px] text-navy">{q.phone}</span>
                        <span className="block text-[11px] text-ink/55">
                          Prefers {PREFERRED_CONTACT_LABEL[q.preferred_contact] ?? q.preferred_contact}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular whitespace-nowrap">
                        {q.items_count}
                        {q.attachments_count > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-ink/55" title={`${q.attachments_count} attachment(s)`}>
                            <Paperclip size={12} aria-hidden />
                            <span className="sr-only">attachments:</span>
                            {q.attachments_count}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular whitespace-nowrap">
                        {q.quoted_total ? formatMoney(q.quoted_total, q.currency) : <span className="text-ink/55">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[13px]">
                        {q.valid_until ? formatDay(q.valid_until) : <span className="text-ink/55">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <QuoteStatusPill status={q.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className={cn("md:hidden divide-y divide-[var(--jmn-line)]", loading && "opacity-60")}>
              {rows.map((q) => {
                const wa = whatsappLink(q.phone);
                return (
                  <li key={q.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/admin/rfq/${q.id}`} className="min-w-0">
                        <span className="part-no text-[13px] text-re-blue-text">{q.reference}</span>
                        <span className="block font-medium text-navy truncate">
                          {q.company_name || q.contact_name || q.phone}
                        </span>
                        <span className="block text-[12px] text-ink/55">
                          {timeAgo(q.created_at, now)} · {q.items_count} line{q.items_count === 1 ? "" : "s"}
                          {q.quoted_total ? ` · ${formatMoney(q.quoted_total, q.currency)}` : ""}
                        </span>
                      </Link>
                      <QuoteStatusPill status={q.status} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={telLink(q.phone)}
                        className="h-11 flex-1 inline-flex items-center justify-center gap-2 border border-[var(--jmn-line)] text-[13px] text-navy"
                      >
                        <Phone size={14} aria-hidden /> Call
                      </a>
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 flex-1 inline-flex items-center justify-center gap-2 bg-re-whatsapp text-white text-[13px]"
                        >
                          <MessageCircle size={14} aria-hidden /> WhatsApp
                        </a>
                      )}
                      <Link
                        href={`/admin/rfq/${q.id}`}
                        className="h-11 flex-1 inline-flex items-center justify-center border border-navy text-[13px] text-navy font-medium"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {data && data.count > PAGE_SIZE && (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--jmn-line)] text-[12px] text-ink/60"
          >
            <span className="tabular">
              Page {page} of {totalPages} · {data.count} quotes
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
                className="h-9 w-9 grid place-items-center border border-[var(--jmn-line)] disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
                className="h-9 w-9 grid place-items-center border border-[var(--jmn-line)] disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </span>
          </nav>
        )}
      </div>
      {period !== "any" && (
        <p className="mt-2 text-[12px] text-ink/55">
          Date filter applies to the quotes on this page.
        </p>
      )}
    </div>
  );
}

function listKey(...parts: Array<string | number>): string {
  return parts.join("|");
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-4 border-r border-b md:border-b-0 border-[var(--jmn-line)] last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r">
      <dt className="text-[10px] tracking-[0.16em] uppercase text-ink/60">{label}</dt>
      <dd className={cn("mt-1 tabular text-xl", accent ? "text-re-red-text font-semibold" : "text-navy")}>
        {value}
      </dd>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 bg-white border border-[var(--jmn-line)] text-sm text-navy focus:border-re-blue outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
