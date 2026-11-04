/**
 * Catalogue listing state ↔ URL search params. Server-rendered filters are
 * plain GET forms and links, so everything a visitor can do is a URL:
 *   ?machine=juki-ddl-8700&brand=organ&stock=1&sort=newest&page=2
 * Unknown / malformed values are dropped, never echoed back.
 */
import type { Availability, PartSummary } from "@/lib/api/types";

export const SORTS = ["availability", "name", "newest"] as const;
export type SortKey = (typeof SORTS)[number];
export const DEFAULT_SORT: SortKey = "availability";
export const PAGE_SIZE = 24;

export interface ListingParams {
  /** Machine model slug. */
  machine: string;
  /** Machine brand slug (when no specific model is picked). */
  mbrand: string;
  /** Parts brand slug (category pages). */
  brand: string;
  /** Category slug (parts-brand pages). */
  category: string;
  inStock: boolean;
  sort: SortKey;
  page: number;
}

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const SLUG = /^[\p{L}\p{M}\p{N}_-]{1,200}$/u;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const slug = (v: string | string[] | undefined) => {
  const x = first(v).trim();
  return SLUG.test(x) ? x : "";
};

export function parseListingParams(sp: SearchParamsRecord): ListingParams {
  const sort = first(sp.sort) as SortKey;
  const page = Number.parseInt(first(sp.page), 10);
  return {
    machine: slug(sp.machine),
    mbrand: slug(sp.mbrand),
    brand: slug(sp.brand),
    category: slug(sp.category),
    inStock: ["1", "true", "on", "yes"].includes(first(sp.stock).toLowerCase()),
    sort: (SORTS as readonly string[]).includes(sort) ? sort : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 1000) : 1,
  };
}

/** True when any facet narrows the listing (→ noindex, canonical to base). */
export function hasActiveFilters(p: ListingParams): boolean {
  return Boolean(p.machine || p.mbrand || p.brand || p.category || p.inStock || p.sort !== DEFAULT_SORT);
}

/** Query object for a listing URL; defaults are omitted to keep URLs short. */
export function listingQuery(p: ListingParams, patch: Partial<ListingParams> = {}): Record<string, string> {
  const next = { ...p, ...patch };
  const q: Record<string, string> = {};
  if (next.machine) q.machine = next.machine;
  if (next.mbrand && !next.machine) q.mbrand = next.mbrand;
  if (next.brand) q.brand = next.brand;
  if (next.category) q.category = next.category;
  if (next.inStock) q.stock = "1";
  if (next.sort !== DEFAULT_SORT) q.sort = next.sort;
  if (next.page > 1) q.page = String(next.page);
  return q;
}

const AVAILABILITY_RANK: Record<Availability, number> = {
  in_stock: 0,
  low_stock: 1,
  on_request: 2,
  out_of_stock: 3,
  discontinued: 4,
};

export const isInStock = (p: Pick<PartSummary, "availability">) =>
  p.availability === "in_stock" || p.availability === "low_stock";

const byName = (a: PartSummary, b: PartSummary) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }) || a.slug.localeCompare(b.slug);

export function sortParts(parts: PartSummary[], sort: SortKey): PartSummary[] {
  const out = [...parts];
  if (sort === "name") return out.sort(byName);
  if (sort === "newest") return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b));
  return out.sort((a, b) => AVAILABILITY_RANK[a.availability] - AVAILABILITY_RANK[b.availability] || byName(a, b));
}

/** Facet filters only (the base filter — category / parts brand / model —
 *  is already applied by the API query). */
export function filterParts(parts: PartSummary[], p: ListingParams): PartSummary[] {
  return parts.filter(
    (x) =>
      (!p.machine || x.machineModelSlugs.includes(p.machine)) &&
      (!p.mbrand || p.machine || x.machineBrandSlugs.includes(p.mbrand)) &&
      (!p.brand || x.brandSlug === p.brand) &&
      (!p.category || x.categorySlug === p.category) &&
      (!p.inStock || isInStock(x)),
  );
}

export interface ListingPage {
  rows: PartSummary[];
  total: number;
  page: number;
  pageCount: number;
}

export function paginate(parts: PartSummary[], page: number, size = PAGE_SIZE): ListingPage {
  const pageCount = Math.max(1, Math.ceil(parts.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    rows: parts.slice((current - 1) * size, current * size),
    total: parts.length,
    page: current,
    pageCount,
  };
}

export function applyListing(parts: PartSummary[], p: ListingParams, size = PAGE_SIZE): ListingPage {
  return paginate(sortParts(filterParts(parts, p), p.sort), p.page, size);
}

/** Compact page list with gaps: [1, "…", 4, 5, 6, "…", 12]. */
export function pageWindow(page: number, pageCount: number, radius = 1): (number | "gap")[] {
  const pages = new Set([1, pageCount]);
  for (let i = page - radius; i <= page + radius; i++) if (i >= 1 && i <= pageCount) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/** Facet counts from the base set: value → number of parts. */
export function countBy(parts: PartSummary[], key: (p: PartSummary) => string | string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of parts) {
    const k = key(p);
    for (const v of Array.isArray(k) ? k : [k]) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

/**
 * Phones page by "Load more": page N shows every row from page 1 to N, and
 * `anchor` is the index of the first row the last tap added (0 on page 1).
 */
export function applyListingUpTo(parts: PartSummary[], p: ListingParams, size = PAGE_SIZE): { rows: PartSummary[]; anchor: number } {
  const all = sortParts(filterParts(parts, p), p.sort);
  const pageCount = Math.max(1, Math.ceil(all.length / size));
  const page = Math.min(Math.max(1, p.page), pageCount);
  return { rows: all.slice(0, page * size), anchor: (page - 1) * size };
}

/**
 * Minimal per-part facet data for the phone filter sheet's live
 * "Show N results" count — slugs only, no names or prices.
 */
export interface FacetRow {
  /** Machine model slugs. */
  m: string[];
  /** Machine brand slugs. */
  b: string[];
  /** Parts brand slug. */
  p: string;
  /** Category slug. */
  c: string;
  /** In stock (in_stock / low_stock). */
  s: 0 | 1;
}

export const facetRows = (parts: PartSummary[]): FacetRow[] =>
  parts.map((x) => ({ m: x.machineModelSlugs, b: x.machineBrandSlugs, p: x.brandSlug, c: x.categorySlug, s: isInStock(x) ? 1 : 0 }));

/** The filter form's current values (FormData entries) → how many rows match. Same rules as filterParts. */
export function countMatches(rows: FacetRow[], form: Iterable<[string, FormDataEntryValue]>): number {
  const v: Record<string, string> = {};
  for (const [k, val] of form) if (typeof val === "string") v[k] = val;
  const machine = v.machine ?? "";
  const mbrand = v.mbrand ?? "";
  const brand = v.brand ?? "";
  const category = v.category ?? "";
  const inStock = ["1", "true", "on", "yes"].includes((v.stock ?? "").toLowerCase());
  let n = 0;
  for (const r of rows) {
    if (machine && !r.m.includes(machine)) continue;
    if (mbrand && !machine && !r.b.includes(mbrand)) continue;
    if (brand && r.p !== brand) continue;
    if (category && r.c !== category) continue;
    if (inStock && !r.s) continue;
    n++;
  }
  return n;
}
