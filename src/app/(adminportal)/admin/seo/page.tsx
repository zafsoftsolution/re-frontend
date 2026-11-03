"use client";

/**
 * SEO Audit dashboard.
 *
 * One-shot health check across the catalog + site config:
 *   - Aggregate score 0-100 (heuristic)
 *   - Stat cards for missing titles / descriptions / images / over-length text
 *   - Issue list grouped by severity
 *   - Drill-down lists per category with a "Fix" link to the product
 *
 * Source: GET /api/inventory/seo/audit/
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
import {
  djangoAdmin,
  type SeoAuditIssue,
  type SeoAuditProductRow,
  type SeoAuditResponse,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import { cn } from "@/lib/utils";

type IssueTab =
  | "missing_seo_title"
  | "missing_seo_description"
  | "title_too_long"
  | "description_too_long"
  | "no_images";

const ISSUE_TAB_LABEL: Record<IssueTab, string> = {
  missing_seo_title: "Missing title",
  missing_seo_description: "Missing description",
  title_too_long: "Title too long",
  description_too_long: "Description too long",
  no_images: "No images",
};

export default function SeoAuditPage() {
  const [data, setData] = useState<SeoAuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<IssueTab>("missing_seo_title");

  // State is only set in promise callbacks so the effect can call this
  // without a synchronous setState (react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      djangoAdmin.seo.audit().then(
        (res) => {
          setError(null);
          setData(res);
        },
        (e) => setError((e as Error).message),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const score = data?.score ?? 0;
  const scoreTone = useMemo(() => {
    if (score >= 85) return "emerald";
    if (score >= 60) return "amber";
    return "rose";
  }, [score]);

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

  const k = data.counts;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing · SEO"
        title="SEO health"
        description="Catalogue-wide check for missing metadata, oversized titles, and redirect loops. Run this whenever you import products or before a launch."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/seo/redirects"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <ArrowRight size={14} />
              Redirects
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <Settings size={14} />
              SEO settings
            </Link>
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
              Re-run
            </button>
          </div>
        }
      />

      {/* Score + headline counts */}
      <section className="grid lg:grid-cols-[260px_1fr] gap-4">
        <ScoreCard score={score} tone={scoreTone} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            icon={<FileText size={14} />}
            label="Products"
            value={String(k.products_total)}
          />
          <Stat
            icon={<AlertTriangle size={14} className="text-amber-700" />}
            label="Missing titles"
            value={String(k.missing_seo_title)}
            tone={k.missing_seo_title ? "amber" : undefined}
          />
          <Stat
            icon={<AlertTriangle size={14} className="text-amber-700" />}
            label="Missing descriptions"
            value={String(k.missing_seo_description)}
            tone={k.missing_seo_description ? "amber" : undefined}
          />
          <Stat
            icon={<ImageIcon size={14} className="text-rose-700" />}
            label="No images"
            value={String(k.no_images)}
            tone={k.no_images ? "rose" : undefined}
          />
        </div>
      </section>

      {/* Issues list */}
      {data.issues.length > 0 && (
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg">
          <header className="px-5 py-3 border-b border-[var(--jmn-line)]">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
              Site & integration checks
            </h2>
            <p className="text-[12px] text-ink/55 mt-0.5">
              {data.issues.length} issue{data.issues.length === 1 ? "" : "s"} found.
            </p>
          </header>
          <ul className="divide-y divide-[var(--jmn-line)]">
            {data.issues.map((iss, i) => (
              <IssueRow key={i} issue={iss} />
            ))}
          </ul>
        </section>
      )}

      {/* Product issue tabs */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg">
        <header className="px-5 py-3 border-b border-[var(--jmn-line)] flex flex-wrap gap-2">
          {(Object.keys(ISSUE_TAB_LABEL) as IssueTab[]).map((t) => {
            const count = data.products[t]?.length ?? 0;
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
                {ISSUE_TAB_LABEL[t]}
                <span className="text-[10px] text-ink/40 tabular ml-0.5">
                  {count}
                </span>
              </button>
            );
          })}
        </header>
        <ProductIssueTable
          rows={data.products[tab] ?? []}
          showLength={tab === "title_too_long" || tab === "description_too_long"}
          emptyMessage={
            tab === "no_images"
              ? "Every active product has at least one image. Nice."
              : "No products in this list. Good job."
          }
        />
      </section>

      {/* Taxonomy issues */}
      <section className="grid md:grid-cols-3 gap-4">
        <TaxonomyCard
          title="Categories without SEO title"
          rows={data.categories.missing_seo_title}
          pathPrefix="/admin/categories"
        />
        <TaxonomyCard
          title="Brands without SEO title"
          rows={data.brands.missing_seo_title}
          pathPrefix="/admin/brands"
        />
        <TaxonomyCard
          title="Collections without SEO title"
          rows={data.collections.missing_seo_title}
          pathPrefix="/admin/collections"
        />
      </section>

      {/* Quick links */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 grid sm:grid-cols-3 gap-3 text-sm">
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-navy hover:underline"
        >
          <ExternalLink size={14} />
          Open generated sitemap.xml
        </a>
        <a
          href="/robots.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-navy hover:underline"
        >
          <ExternalLink size={14} />
          Open generated robots.txt
        </a>
        <Link
          href="/admin/seo/redirects"
          className="flex items-center gap-2 text-navy hover:underline"
        >
          <Search size={14} />
          {data.redirects.active} active redirect
          {data.redirects.active === 1 ? "" : "s"}
          {data.redirects.total > data.redirects.active && (
            <span className="text-ink/45">
              ({data.redirects.total - data.redirects.active} disabled)
            </span>
          )}
        </Link>
      </section>
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function ScoreCard({
  score,
  tone,
}: {
  score: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneText =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-rose-700";
  const ring =
    tone === "emerald"
      ? "ring-emerald-200 bg-emerald-50/50"
      : tone === "amber"
      ? "ring-amber-200 bg-amber-50/50"
      : "ring-rose-200 bg-rose-50/50";
  const message =
    score >= 85
      ? "Excellent — keep it up."
      : score >= 60
      ? "Some easy wins — fix the items below."
      : "Lots of room to improve.";
  return (
    <div
      className={cn(
        "rounded-lg p-5 ring-1 border border-transparent",
        ring,
      )}
    >
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55">
        SEO score
      </p>
      <p className={cn("font-display text-5xl tabular mt-2", toneText)}>
        {score}
        <span className="text-2xl text-ink/40">/100</span>
      </p>
      <p className="text-[12px] text-ink/65 mt-2">{message}</p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50/50"
      : tone === "rose"
      ? "border-rose-200 bg-rose-50/50"
      : "border-[var(--jmn-line)] bg-white";
  return (
    <div className={cn("rounded-lg border p-4", cls)}>
      <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-ink/55">
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl text-navy tabular mt-2">{value}</p>
    </div>
  );
}

function IssueRow({ issue }: { issue: SeoAuditIssue }) {
  const tone =
    issue.severity === "danger"
      ? { icon: <AlertTriangle size={14} />, color: "text-rose-700", bg: "bg-rose-50" }
      : issue.severity === "warning"
      ? { icon: <AlertTriangle size={14} />, color: "text-amber-700", bg: "bg-amber-50" }
      : { icon: <Info size={14} />, color: "text-navy", bg: "bg-navy/5" };
  return (
    <li className="px-5 py-3 flex items-start gap-3">
      <span
        className={cn(
          "shrink-0 h-7 w-7 grid place-items-center rounded-full",
          tone.bg,
          tone.color,
        )}
      >
        {tone.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-navy font-medium">{issue.title}</p>
        <p className="text-[12px] text-ink/55 mt-0.5">{issue.detail}</p>
      </div>
      <Link
        href={issue.fix_url}
        className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline shrink-0"
      >
        Fix →
      </Link>
    </li>
  );
}

function ProductIssueTable({
  rows,
  showLength,
  emptyMessage,
}: {
  rows: SeoAuditProductRow[];
  showLength?: boolean;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <CheckCircle2 size={20} className="mx-auto text-emerald-600 mb-2" />
        <p className="text-sm text-ink/55">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
          <tr>
            <th className="text-left font-medium pl-5 pr-2 py-3">Product</th>
            <th className="text-left font-medium px-2 py-3">Slug</th>
            {showLength && (
              <th className="text-right font-medium px-2 py-3">Length</th>
            )}
            <th className="pl-2 pr-5 py-3 w-[100px] text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] transition-colors"
            >
              <td className="pl-5 pr-2 py-2.5 text-navy">{p.name}</td>
              <td className="px-2 py-2.5 text-[12px] text-ink/55 tabular">
                /products/{p.slug}
              </td>
              {showLength && (
                <td className="px-2 py-2.5 text-right tabular text-amber-700">
                  {p.length} chars
                </td>
              )}
              <td className="pl-2 pr-5 py-2.5 text-right">
                <Link
                  href={`/admin/products?slug=${p.slug}`}
                  className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline"
                >
                  Open →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaxonomyCard({
  title,
  rows,
  pathPrefix,
}: {
  title: string;
  rows: SeoAuditProductRow[];
  pathPrefix: string;
}) {
  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-lg">
      <header className="px-4 py-3 border-b border-[var(--jmn-line)] flex items-center justify-between">
        <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold">
          {title}
        </h3>
        <span className="text-[11px] text-ink/55 tabular">{rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-ink/55">
          <CheckCircle2 size={16} className="mx-auto text-emerald-600 mb-1" />
          All good.
        </div>
      ) : (
        <ul className="max-h-[260px] overflow-y-auto divide-y divide-[var(--jmn-line)]">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-navy truncate">{r.name}</p>
                <p className="text-[11px] text-ink/45 tabular truncate">/{r.slug}</p>
              </div>
              <Link
                href={pathPrefix}
                className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline shrink-0"
              >
                Open →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
