"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
  XCircle,
} from "lucide-react";
import {
  djangoAdmin,
  type PaginatedResponse,
  type ProductBulkSet,
  type ProductSalesModeSetting,
  type SiteSalesMode,
} from "@/lib/django-admin";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import { AVAILABILITY_LABEL, SALES_MODE_LABEL } from "@/lib/admin/sales-mode";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import StatusPill from "@/components/admin/StatusPill";
import { formatMoney } from "@/lib/admin/quotes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export interface ProductRow {
  id: string;
  sku: string;
  part_number: string;
  alt_part_numbers: string[];
  name: string;
  slug: string;
  category: string;
  category_name: string;
  brand: string | null;
  brand_name: string | null;
  machine_brands: string[];
  price: string | null;
  currency: string;
  images: string[];
  status: string;
  available_qty: number;
  total_stock: number;
  availability: string;
  lead_time_days: number | null;
  price_on_request: boolean;
  /** Effective public mode: "direct" | "quote". */
  sales_mode: "direct" | "quote";
  /** Raw per-product setting (staff responses only). */
  sales_mode_setting?: ProductSalesModeSetting;
}

interface Cat { id: string; name: string; slug: string; parent?: string | null }

const AVAILABILITY_STYLE: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
  in_stock: { cls: "text-re-stock-in", Icon: CheckCircle2 },
  low_stock: { cls: "text-re-stock-low bg-re-stock-low-bg px-1", Icon: AlertTriangle },
  out_of_stock: { cls: "text-re-steel-600", Icon: XCircle },
  on_request: { cls: "text-re-blue-text", Icon: Clock },
  discontinued: { cls: "text-re-steel-600 line-through decoration-1", Icon: Ban },
};

export function AvailabilityBadge({ value, qty }: { value: string; qty?: number }) {
  const s = AVAILABILITY_STYLE[value] ?? AVAILABILITY_STYLE.out_of_stock;
  const Icon = s.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] whitespace-nowrap", s.cls)}>
      <Icon size={13} aria-hidden />
      {AVAILABILITY_LABEL[value] ?? value}
      {qty !== undefined && value !== "discontinued" && value !== "on_request" && (
        <span className="tabular text-ink/60 no-underline">· {qty}</span>
      )}
    </span>
  );
}

export function SalesModeCell({ row }: { row: ProductRow }) {
  const setting = row.sales_mode_setting ?? "inherit";
  return (
    <span className="inline-flex flex-col">
      <span className="text-[12px] text-navy">{SALES_MODE_LABEL[setting]}</span>
      <span className={cn("text-[11px]", row.sales_mode === "direct" ? "text-re-stock-in font-medium" : "text-ink/60")}>
        {row.sales_mode === "direct" ? "Price shown" : row.price_on_request ? "Price on request ✱" : "Quote"}
      </span>
    </span>
  );
}

type BulkKind = "sales_mode" | "status" | "availability_override" | "category" | "price_on_request";

export default function ProductsTable() {
  const params = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [searchInput, setSearchInput] = useState(params.get("search") ?? "");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [category, setCategory] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [siteMode, setSiteMode] = useState<SiteSalesMode | null>(null);
  const [result, setResult] = useState<{ key: string; data?: PaginatedResponse<ProductRow>; error?: string } | null>(null);

  useEffect(() => {
    const next = searchInput.trim();
    const t = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    djangoAdmin.categories
      .list<{ results?: Cat[] } | Cat[]>({ page_size: 200 })
      .then((d) => !cancelled && setCats(Array.isArray(d) ? d : d.results ?? []))
      .catch(() => {});
    djangoAdmin.siteSettings
      .get()
      .then((s) => !cancelled && setSiteMode(s.sales_mode ?? "quote_only"))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const key = [search, status, category, ordering, page, tick].join("|");
  useEffect(() => {
    let cancelled = false;
    const k = [search, status, category, ordering, page, tick].join("|");
    djangoAdmin.products
      .list({
        search: search || undefined,
        status: status || undefined,
        "category__slug": category || undefined,
        ordering,
        page,
      })
      .then(
        (d) => !cancelled && setResult({ key: k, data: d as PaginatedResponse<ProductRow> }),
        (e: Error) => !cancelled && setResult({ key: k, error: e.message }),
      );
    return () => {
      cancelled = true;
    };
  }, [search, status, category, ordering, page, tick]);

  const loading = result?.key !== key;
  const rows = useMemo(() => result?.data?.results ?? [], [result]);
  const count = result?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const error = result?.key === key ? result.error : undefined;

  const pageSlugs = useMemo(() => rows.map((r) => r.slug), [rows]);
  const allOnPage = pageSlugs.length > 0 && pageSlugs.every((s) => selected.has(s));
  const someOnPage = pageSlugs.some((s) => selected.has(s));

  const toggle = (slug: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOnPage) pageSlugs.forEach((s) => n.delete(s));
      else pageSlugs.forEach((s) => n.add(s));
      return n;
    });

  async function runBulk(kind: BulkKind, value: string) {
    if (!value || selected.size === 0) return;
    const slugs = [...selected];
    let set: ProductBulkSet;
    let label: string;
    switch (kind) {
      case "sales_mode":
        set = { sales_mode: value as ProductSalesModeSetting };
        label = `sales mode → ${SALES_MODE_LABEL[value as ProductSalesModeSetting]}`;
        break;
      case "status":
        set = { status: value as ProductBulkSet["status"] };
        label = `status → ${value}`;
        break;
      case "availability_override":
        set = { availability_override: value as ProductBulkSet["availability_override"] };
        label = `availability → ${value.replace("_", " ")}`;
        break;
      case "price_on_request":
        set = { price_on_request: value === "on" };
        label = `price on request ${value}`;
        break;
      case "category":
        set = { category: value };
        label = `category → ${cats.find((c) => c.slug === value)?.name ?? value}`;
        break;
    }
    const directWarning =
      kind === "sales_mode" && value === "direct" && siteMode !== "mixed"
        ? " The site is in Quote-only mode, so these parts stay quote-only until you switch Settings → Sales mode to Mixed."
        : kind === "sales_mode" && value === "direct"
          ? " Their internal prices become visible on the public site."
          : "";
    const ok = await confirm({
      title: `Change ${slugs.length} part${slugs.length === 1 ? "" : "s"}?`,
      description: `Set ${label}.${directWarning}`,
      confirmLabel: "Apply",
      tone: kind === "status" && value === "archived" ? "danger" : "default",
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      const r = await djangoAdmin.products.bulkUpdate(slugs, set);
      toast.success(
        `Updated ${r.updated} part${r.updated === 1 ? "" : "s"}`,
        [r.unchanged ? `${r.unchanged} already set` : "", r.not_found.length ? `${r.not_found.length} not found` : ""]
          .filter(Boolean)
          .join(" · ") || undefined,
      );
      setSelected(new Set());
      setTick((t) => t + 1);
    } catch (e) {
      toast.error("Bulk update failed", (e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Every spare part. Prices here are internal — the public site shows them only for direct-sale parts."
        actions={
          <>
            <button
              type="button"
              onClick={() =>
                djangoAdmin.products
                  .exportCsv({ search: search || undefined, status: status || undefined, "category__slug": category || undefined })
                  .then((f) => toast.success("Exported", f), (e: Error) => toast.error("Couldn't export", e.message))
              }
              className="h-10 px-3 inline-flex items-center gap-2 border border-[var(--jmn-line)] bg-white text-[13px] text-navy hover:border-navy/40"
            >
              <Download size={14} aria-hidden /> Export CSV
            </button>
            <Link href="/admin/products/import" className="h-10 px-3 inline-flex items-center gap-2 border border-[var(--jmn-line)] bg-white text-[13px] text-navy hover:border-navy/40">
              <FileSpreadsheet size={14} aria-hidden /> Import parts
            </Link>
            <Link href="/admin/products/new" className="h-10 px-4 inline-flex items-center gap-2 bg-re-red-cta text-white text-[13px] font-semibold hover:bg-re-red-hover">
              <Plus size={14} aria-hidden /> New part
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="relative flex-1 min-w-[220px] max-w-md">
          <span className="sr-only">Search parts</span>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/55" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Part number, SKU or name"
            className="w-full h-10 pl-9 pr-3 bg-white border border-[var(--jmn-line)] text-sm outline-none focus:border-re-blue"
          />
        </label>
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }}
          options={[["", "All statuses"], ["active", "Active"], ["draft", "Draft"], ["archived", "Archived"]]} />
        <FilterSelect label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }}
          options={[["", "All categories"], ...cats.map((c) => [c.slug, c.name] as [string, string])]} />
        <FilterSelect label="Sort" value={ordering} onChange={(v) => { setOrdering(v); setPage(1); }}
          options={[["-created_at", "Newest"], ["name", "Name A–Z"], ["price", "Price ↑"], ["-price", "Price ↓"]]} />
      </div>

      <div className="bg-white border border-[var(--jmn-line)]">
        {error ? (
          <p className="p-6 text-sm text-rose-700" role="alert">Couldn&apos;t load products: {error}</p>
        ) : !result?.data && loading ? (
          <div className="p-10 grid place-items-center"><Loader2 className="animate-spin text-ink/55" aria-label="Loading" /></div>
        ) : rows.length === 0 ? (
          <EmptyState title={search ? `No parts match “${search}”` : "No parts yet"} description="Create a part or import a spreadsheet." />
        ) : (
          <div className={cn("overflow-x-auto", loading && "opacity-60")}>
            <table className="w-full text-sm min-w-[980px]" data-testid="products-table">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.14em] uppercase text-ink/60 bg-re-steel-50 border-b border-[var(--jmn-line)]">
                  <th scope="col" className="pl-4 pr-2 py-2.5 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all parts on this page"
                      checked={allOnPage}
                      ref={(el) => { if (el) el.indeterminate = !allOnPage && someOnPage; }}
                      onChange={togglePage}
                      className="h-4 w-4 accent-[#231F20]"
                    />
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Part</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Part no.</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Sales mode</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Availability</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold text-right">Price</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const on = selected.has(p.slug);
                  return (
                    <tr key={p.slug} className={cn("border-b border-[var(--jmn-line)] last:border-0", on ? "bg-[#EEF5FB]" : "hover:bg-re-steel-50")}>
                      <td className="pl-4 pr-2 py-2.5">
                        <input type="checkbox" checked={on} onChange={() => toggle(p.slug)}
                          aria-label={`Select ${p.name}`} className="h-4 w-4 accent-[#231F20]" data-testid="row-select" />
                      </td>
                      <td className="px-3 py-2.5 max-w-[300px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 overflow-hidden bg-re-steel-100 border border-re-steel-200">
                            {p.images?.[0] && (
                              <Image src={p.images[0]} alt="" width={40} height={40} className="h-full w-full object-cover" unoptimized />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.slug}/edit`} className="block font-medium text-navy truncate hover:underline">{p.name}</Link>
                            <span className="block part-no text-[11px] text-ink/60 truncate">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="part-no text-[13px] text-navy">{p.part_number || "—"}</span>
                        {p.alt_part_numbers?.length > 0 && (
                          <span className="block text-[11px] text-ink/60" title={p.alt_part_numbers.join(", ")}>
                            +{p.alt_part_numbers.length} alt
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-navy">{p.category_name || p.category}</td>
                      <td className="px-3 py-2.5"><SalesModeCell row={p} /></td>
                      <td className="px-3 py-2.5"><AvailabilityBadge value={p.availability} qty={p.available_qty} /></td>
                      <td className="px-3 py-2.5 text-right tabular whitespace-nowrap">{formatMoney(p.price, p.currency)}</td>
                      <td className="px-3 py-2.5"><StatusPill status={p.status} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/admin/products/${p.slug}/edit`} aria-label={`Edit ${p.name}`}
                          className="h-9 w-9 inline-grid place-items-center text-navy hover:bg-re-steel-100">
                          <Pencil size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {count > PAGE_SIZE && (
          <nav aria-label="Pagination" className="flex items-center justify-between px-4 py-3 border-t border-[var(--jmn-line)] text-[12px] text-ink/60">
            <span className="tabular">Page {page} of {totalPages} · {count} parts</span>
            <span className="flex gap-1">
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 w-9 grid place-items-center border border-[var(--jmn-line)] disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 w-9 grid place-items-center border border-[var(--jmn-line)] disabled:opacity-40"><ChevronRight size={14} /></button>
            </span>
          </nav>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          data-testid="bulk-bar"
          className="fixed bottom-0 inset-x-0 lg:left-[260px] z-20 bg-re-ink text-white border-t-2 border-re-red"
        >
          <div className="px-4 lg:px-10 py-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tabular mr-2" aria-live="polite">
              {selected.size} selected
            </span>
            <button type="button" onClick={() => setSelected(new Set())} className="h-9 px-2 inline-flex items-center gap-1 text-[13px] text-white/80 hover:text-white">
              <X size={14} aria-hidden /> Clear
            </button>
            <span className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />
            <BulkSelect label="Sales mode" disabled={bulkBusy} onPick={(v) => runBulk("sales_mode", v)}
              options={[["quote_only", "Quote only"], ["direct", "Direct"], ["inherit", "Inherit"]]} testId="bulk-sales-mode" />
            <BulkSelect label="Status" disabled={bulkBusy} onPick={(v) => runBulk("status", v)}
              options={[["active", "Active"], ["draft", "Draft"], ["archived", "Archived"]]} />
            <BulkSelect label="Availability" disabled={bulkBusy} onPick={(v) => runBulk("availability_override", v)}
              options={[["auto", "Automatic"], ["on_request", "On request"], ["discontinued", "Discontinued"]]} />
            <BulkSelect label="Price on request" disabled={bulkBusy} onPick={(v) => runBulk("price_on_request", v)}
              options={[["on", "On"], ["off", "Off"]]} />
            <BulkSelect label="Move to category" disabled={bulkBusy} onPick={(v) => runBulk("category", v)}
              options={cats.map((c) => [c.slug, c.name] as [string, string])} />
            {bulkBusy && <Loader2 size={16} className="animate-spin ml-1" aria-label="Applying" />}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 bg-white border border-[var(--jmn-line)] text-sm text-navy outline-none focus:border-re-blue max-w-[220px]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** A select that fires once per pick and resets to its label. */
function BulkSelect({ label, options, onPick, disabled, testId }: {
  label: string; options: [string, string][]; onPick: (v: string) => void; disabled?: boolean; testId?: string;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value=""
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => {
          const v = e.target.value;
          e.target.value = "";
          onPick(v);
        }}
        className="h-9 px-2 bg-re-ink border border-white/30 text-[13px] text-white outline-none focus:border-white disabled:opacity-50"
      >
        <option value="" disabled>{label}…</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
