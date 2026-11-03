/**
 * Catalogue slug index + route guard. Pure (no Next imports) so it runs in
 * src/proxy.ts and in unit tests.
 *
 * Why: with Cache Components + Partial Prefetching, a page that calls
 * notFound() after the App Shell has started streaming can only answer
 * 200 + noindex. The proxy runs before rendering, so it validates catalogue
 * slugs here and rewrites unknown ones to the localized 404 page (a real
 * HTTP 404). Pages still call notFound() as a second line of defence.
 */
import type { CatalogIndex } from "./types";

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const s = (v: unknown) => (typeof v === "string" ? v : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObj) : []);

/** Model × category pages exist only with at least this many parts. */
export const MIN_MODEL_CATEGORY_PARTS = 3;

/** Placeholder param for generateStaticParams when the catalogue is empty
 *  (Cache Components requires ≥ 1 param). Pages 404 it without fetching. */
export const PLACEHOLDER_SLUG = "__placeholder__";

/** Parse GET /api/site/sitemap-entries/ ({products, machine_brands, …}). */
export function parseSitemapIndex(data: unknown): CatalogIndex | null {
  if (!isObj(data) || !Array.isArray(data.machine_brands) || !Array.isArray(data.products)) return null;
  return {
    machineBrands: list(data.machine_brands).map((b) => s(b.slug)).filter(Boolean),
    machineModels: list(data.machine_models)
      .map((m) => ({ slug: s(m.slug), brandSlug: s(m.brand_slug), partsCount: n(m.parts_count) }))
      .filter((m) => m.slug && m.brandSlug),
    modelCategories: list(data.model_categories)
      .map((r) => ({
        brandSlug: s(r.brand_slug),
        modelSlug: s(r.model_slug),
        categorySlug: s(r.category_slug),
        count: n(r.count),
      }))
      .filter((r) => r.modelSlug && r.categorySlug && r.count >= MIN_MODEL_CATEGORY_PARTS),
    categories: list(data.categories)
      .map((c) => ({ slug: s(c.slug), productCount: n(c.product_count) }))
      .filter((c) => c.slug),
    brands: list(data.brands)
      .map((b) => ({ slug: s(b.slug), productCount: n(b.product_count) }))
      .filter((b) => b.slug),
    parts: list(data.products).map((p) => s(p.slug)).filter(Boolean),
    complete: { parts: true, modelCategories: Array.isArray(data.model_categories) },
  };
}

/** Index from the older list endpoints (production before Phase 1 deploys).
 *  Parts and model × category combos are not enumerable there. */
export function indexFromLists(lists: {
  machineBrands: Raw[];
  machineModels: Raw[];
  categories: Raw[];
  brands: Raw[];
}): CatalogIndex {
  return {
    machineBrands: lists.machineBrands.map((b) => s(b.slug)).filter(Boolean),
    machineModels: lists.machineModels
      .map((m) => ({ slug: s(m.slug), brandSlug: s(m.machine_brand_slug), partsCount: n(m.parts_count) }))
      .filter((m) => m.slug && m.brandSlug),
    modelCategories: [],
    categories: lists.categories.map((c) => ({ slug: s(c.slug), productCount: n(c.product_count) })).filter((c) => c.slug),
    brands: lists.brands.map((b) => ({ slug: s(b.slug), productCount: n(b.product_count) })).filter((b) => b.slug),
    parts: [],
    complete: { parts: false, modelCategories: false },
  };
}

// ─── Guard ───────────────────────────────────────────────────────────────────

export type GuardResult =
  | { kind: "ok" }
  | { kind: "not-found" }
  /** `path` is locale-less ("/machines/juki/juki-ddl-8700#cat-needles"). */
  | { kind: "redirect"; path: string; permanent: boolean };

/** Async data the guard needs. Each method returns `undefined` when the
 *  backend could not answer (network error) — the guard then lets the
 *  request through rather than 404-ing the site during an outage. */
export interface CatalogLookup {
  /** Current index, or null when unavailable. `refresh` forces a reload
   *  if the cached copy is older than a minute. */
  index(opts?: { refresh?: boolean }): Promise<CatalogIndex | null>;
  /** Detail check for one part slug: true / false (HTTP 404) / undefined. */
  partExists(slug: string): Promise<boolean | undefined>;
  /** Machine model detail: brand + per-category part counts; null = 404. */
  model(slug: string): Promise<{ brandSlug: string; categories: { slug: string; count: number }[] } | null | undefined>;
}

// Letters, combining marks (Bangla vowel signs), digits, _ and -.
const SLUG = /^[\p{L}\p{M}\p{N}_-]{1,200}$/u;

/** Django slug (incl. unicode slugs); rejects dots, encoded slashes, etc. */
export function isValidSlug(raw: string): boolean {
  let v = raw;
  try {
    v = decodeURIComponent(raw);
  } catch {
    return false;
  }
  return SLUG.test(v);
}

const OK: GuardResult = { kind: "ok" };
const NOT_FOUND: GuardResult = { kind: "not-found" };

/** Static child segments that are routes, not slugs. */
const RESERVED = { machines: new Set(["find"]) } as const;

/**
 * Decide what the proxy does with a catalogue path. `segments` are the
 * locale-less path segments, e.g. ["machines", "juki", "juki-ddl-8700"].
 * Non-catalogue sections always pass.
 */
export async function guardCatalogPath(segments: string[], lookup: CatalogLookup): Promise<GuardResult> {
  const [section, ...rest] = segments;
  if (section !== "machines" && section !== "parts" && section !== "categories" && section !== "brands") return OK;
  if (rest.length === 0) {
    // There is no /parts index page — the catalogue is browsed by category.
    return section === "parts" ? { kind: "redirect", path: "/categories", permanent: false } : OK;
  }
  if (section === "machines" && rest.length === 1 && RESERVED.machines.has(rest[0])) return OK;
  const maxDepth = section === "machines" ? 3 : 1;
  if (rest.length > maxDepth || !rest.every(isValidSlug)) return NOT_FOUND;
  const slugs = rest.map((r) => decodeURIComponent(r));

  const has = async (pick: (ix: CatalogIndex) => boolean): Promise<boolean | undefined> => {
    const ix = await lookup.index();
    if (!ix) return undefined;
    if (pick(ix)) return true;
    // A miss may be something published since the index was loaded.
    const fresh = await lookup.index({ refresh: true });
    return fresh ? pick(fresh) : undefined;
  };

  if (section === "categories") {
    return (await has((ix) => ix.categories.some((c) => c.slug === slugs[0]))) === false ? NOT_FOUND : OK;
  }
  if (section === "brands") {
    return (await has((ix) => ix.brands.some((b) => b.slug === slugs[0]))) === false ? NOT_FOUND : OK;
  }
  if (section === "parts") {
    const ix = await lookup.index();
    if (ix?.parts.includes(slugs[0])) return OK;
    if (ix?.complete.parts) {
      const hit = await has((i) => i.parts.includes(slugs[0]));
      return hit === false ? NOT_FOUND : OK;
    }
    // Parts not enumerable (list-endpoint fallback): confirm by detail.
    return (await lookup.partExists(slugs[0])) === false ? NOT_FOUND : OK;
  }

  // machines/[brand](/[model](/[category]))
  const [brand, model, category] = slugs;
  const brandOk = await has((ix) => ix.machineBrands.includes(brand));
  if (brandOk === false) return NOT_FOUND;
  if (!model) return OK;

  const ix = await lookup.index();
  let modelBrand = ix?.machineModels.find((m) => m.slug === model)?.brandSlug;
  let modelCats: { slug: string; count: number }[] | undefined;
  if (!modelBrand) {
    const detail = await lookup.model(model);
    if (detail === null) return NOT_FOUND;
    if (detail === undefined) return OK;
    modelBrand = detail.brandSlug;
    modelCats = detail.categories;
  }
  if (modelBrand !== brand) {
    // Right model, wrong brand in the URL → its canonical address.
    return { kind: "redirect", path: ["/machines", modelBrand, model, category].filter(Boolean).join("/"), permanent: true };
  }
  if (!category) return OK;

  if (ix?.complete.modelCategories) {
    const combo = ix.modelCategories.some((r) => r.modelSlug === model && r.categorySlug === category);
    if (combo) return OK;
  }
  modelCats ??= (await lookup.model(model))?.categories;
  if (!modelCats) return OK; // backend unreachable — let the page decide
  const count = modelCats.find((c) => c.slug === category)?.count ?? 0;
  if (count >= MIN_MODEL_CATEGORY_PARTS) return OK;
  // Too few parts for its own page: show them on the model page instead.
  if (count > 0) return { kind: "redirect", path: `/machines/${brand}/${model}#cat-${category}`, permanent: false };
  return NOT_FOUND;
}
