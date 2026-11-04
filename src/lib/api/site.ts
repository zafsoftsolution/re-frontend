/**
 * Cached public-site readers. Each one:
 *  - takes the route `locale` as an argument (part of the cache key, sent as
 *    Accept-Language so Bangla is server-rendered),
 *  - runs inside `'use cache'` with a cacheTag the backend can revalidate,
 *  - never throws: on network/HTTP failure it returns a typed fallback and
 *    shortens its cacheLife so the page heals within minutes.
 *
 * Endpoints marked NEW are being added by the backend; they may 404 on prod
 * until deployed, in which case we fall back to the existing endpoints.
 */
import { cacheLife, cacheTag } from "next/cache";
import { ApiError, apiFetch, unwrapList } from "./client";
import {
  FALLBACK_SETTINGS,
  mapCategory,
  mapCategoryDetail,
  mapList,
  mapMachineBrand,
  mapMachineBrandDetail,
  mapMachineModel,
  mapMachineModelDetail,
  mapPart,
  mapPartDetail,
  mapPartsBrand,
  mapPartsBrandDetail,
  mapSettings,
} from "./mappers";
import { indexFromLists, parseSitemapIndex, PLACEHOLDER_SLUG } from "./catalog-index";
import { TAGS } from "./tags";
import { parseRedirects } from "@/lib/redirects";
import { parseSitemapFeed } from "@/lib/seo/sitemap";
import type {
  CatalogIndex,
  CategoryDetail,
  CategorySummary,
  MachineBrandDetail,
  MachineBrandSummary,
  MachineModelDetail,
  MachineModelSummary,
  PartDetail,
  PartsBrandDetail,
  PartsBrandSummary,
  PartSummary,
  RfqInput,
  RfqReceipt,
  SearchResults,
  SiteBootstrap,
  SitemapFeed,
  SiteRedirect,
} from "./types";
import { normalizePartNumber } from "@/lib/part-number";

type Raw = Record<string, unknown>;

async function tryFetch<T>(path: string, locale: string, query?: Raw): Promise<T | null> {
  try {
    return await apiFetch<T>(path, { locale, query: query as never });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      const why = err instanceof ApiError ? `HTTP ${err.status}` : (err as Error)?.message;
      console.warn(`[api] ${path} unavailable (${why}) — using fallback`);
    }
    return null;
  }
}

/**
 * Every page of a DRF list. Most catalogue viewsets ignore `page_size` and
 * serve 25 rows a page, so follow page numbers (not `next` - that URL
 * carries the backend's own host) up to `maxPages`. Page 1 failing -> null;
 * a later page failing -> what we have so far.
 */
async function fetchList<T>(
  path: string,
  locale: string,
  mapper: (d: unknown) => T | null,
  query?: Raw,
  maxPages = 20,
): Promise<T[] | null> {
  const q = { page_size: 100, ...query };
  const firstPage = await tryFetch<unknown>(path, locale, q);
  if (firstPage === null) return null;
  const out = mapList(unwrapList(firstPage as never), mapper);
  if (Array.isArray(firstPage) || !(firstPage as Raw).next) return out;
  const rows = unwrapList(firstPage as never).length || 1;
  const total = Number((firstPage as Raw).count) || 0;
  const pages = Math.min(maxPages, Math.ceil(total / rows));
  // Remaining pages in small parallel batches.
  for (let start = 2; start <= pages; start += 6) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(6, pages - start + 1) }, (_, i) =>
        tryFetch<unknown>(path, locale, { ...q, page: start + i }),
      ),
    );
    for (const data of batch) {
      if (data === null) return out;
      out.push(...mapList(unwrapList(data as never), mapper));
    }
  }
  return out;
}

/** Detail GET: null on HTTP 404, throws on anything else (an outage must
 *  surface as an error, never be cached as "not found"). */
async function fetchDetail<T>(path: string, locale: string, mapper: (d: unknown) => T | null): Promise<T | null> {
  try {
    return mapper(await apiFetch<unknown>(path, { locale }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

const usable = (slug: string) => Boolean(slug) && slug !== PLACEHOLDER_SLUG && slug.length <= 200;

// ─── Bootstrap (settings + top categories + machine brands) ─────────────────

export async function getBootstrap(locale: string): Promise<SiteBootstrap> {
  "use cache";
  cacheTag(TAGS.bootstrap, TAGS.settings, TAGS.categories, TAGS.machineBrands, TAGS.machines, TAGS.products, TAGS.brands);

  // NEW endpoint: one round trip for the shell.
  const boot = await tryFetch<Raw>("/site/bootstrap/", locale);
  if (boot && typeof boot === "object") {
    cacheLife("hours");
    const rawSettings = (boot.settings && typeof boot.settings === "object" ? boot.settings : boot) as Raw;
    return {
      // `direct_orders_enabled` / `sales_mode` may sit at the top level.
      settings: mapSettings({
        ...rawSettings,
        direct_orders_enabled: boot.direct_orders_enabled ?? rawSettings.direct_orders_enabled,
        sales_mode: boot.sales_mode ?? rawSettings.sales_mode,
      }),
      categories: mapList(boot.categories, mapCategory),
      machineBrands: mapList(boot.machine_brands, mapMachineBrand),
      partsBrands: mapList(boot.parts_brands, mapPartsBrand),
      live: true,
    };
  }

  // Fallback: existing endpoints in parallel.
  const [settings, categories, machineBrands, partsBrands] = await Promise.all([
    tryFetch<unknown>("/inventory/site-settings/", locale),
    fetchList("/site/categories/", locale, mapCategory),
    fetchList("/site/machine-brands/", locale, mapMachineBrand),
    fetchList("/site/brands/", locale, mapPartsBrand),
  ]);
  const live = settings !== null && categories !== null && machineBrands !== null;
  if (live) cacheLife("hours");
  else cacheLife("minutes");
  return {
    settings: settings ? mapSettings(settings) : FALLBACK_SETTINGS,
    // Top-level categories only (children are listed inside their parent).
    categories: (categories ?? []).filter((c, _i, all) =>
      !all.some((p) => p.children.some((ch) => ch.slug === c.slug)),
    ),
    machineBrands: machineBrands ?? [],
    partsBrands: partsBrands ?? [],
    live,
  };
}

// ─── Catalogue lists ─────────────────────────────────────────────────────────

export async function getCategories(locale: string): Promise<CategorySummary[]> {
  "use cache";
  cacheTag(TAGS.categories);
  const list = await fetchList("/site/categories/", locale, mapCategory);
  if (list) cacheLife("hours");
  else cacheLife("minutes");
  return list ?? [];
}

export async function getMachineBrands(locale: string): Promise<MachineBrandSummary[]> {
  "use cache";
  cacheTag(TAGS.machineBrands, TAGS.machines);
  const list = await fetchList("/site/machine-brands/", locale, mapMachineBrand);
  if (list) cacheLife("hours");
  else cacheLife("minutes");
  return list ?? [];
}

export async function getMachineModels(
  locale: string,
  brandSlug?: string,
): Promise<MachineModelSummary[]> {
  "use cache";
  cacheTag(TAGS.machineModels, TAGS.machines, ...(brandSlug ? [TAGS.machineBrand(brandSlug)] : []));
  const list = await fetchList("/site/machine-models/", locale, mapMachineModel, {
    machine_brand__slug: brandSlug,
    page_size: 500,
  });
  if (list) cacheLife("hours");
  else cacheLife("minutes");
  return list ?? [];
}

export async function getPartsBrands(locale: string): Promise<PartsBrandSummary[]> {
  "use cache";
  cacheTag(TAGS.brands);
  const list = await fetchList("/site/brands/", locale, mapPartsBrand);
  if (list) cacheLife("hours");
  else cacheLife("minutes");
  return list ?? [];
}

export async function getParts(
  locale: string,
  filters: { category?: string; brand?: string; machineBrand?: string; machineModel?: string; ordering?: string; pageSize?: number } = {},
): Promise<PartSummary[]> {
  "use cache";
  cacheTag(TAGS.products);
  const list = await fetchList("/site/products/", locale, mapPart, {
    category__slug: filters.category,
    brand__slug: filters.brand,
    machine_brands__slug: filters.machineBrand,
    machine_models__slug: filters.machineModel,
    ordering: filters.ordering,
    page_size: filters.pageSize ?? 24,
  });
  if (list) cacheLife("hours");
  else cacheLife("minutes");
  return list ?? [];
}

// ─── Catalogue details ───────────────────────────────────────────────────────

export async function getMachineBrand(locale: string, slug: string): Promise<MachineBrandDetail | null> {
  "use cache";
  cacheTag(TAGS.machineBrands, TAGS.machines, TAGS.machineBrand(slug));
  cacheLife("hours");
  if (!usable(slug)) return null;
  return fetchDetail(`/site/machine-brands/${encodeURIComponent(slug)}/`, locale, mapMachineBrandDetail);
}

export async function getMachineModel(locale: string, slug: string): Promise<MachineModelDetail | null> {
  "use cache";
  cacheTag(TAGS.machineModels, TAGS.machines, TAGS.machineModel(slug), TAGS.products);
  cacheLife("hours");
  if (!usable(slug)) return null;
  return fetchDetail(`/site/machine-models/${encodeURIComponent(slug)}/`, locale, mapMachineModelDetail);
}

export async function getCategory(locale: string, slug: string): Promise<CategoryDetail | null> {
  "use cache";
  cacheTag(TAGS.categories, TAGS.category(slug));
  cacheLife("hours");
  if (!usable(slug)) return null;
  const detail = await fetchDetail(`/site/categories/${encodeURIComponent(slug)}/`, locale, mapCategoryDetail);
  if (!detail || detail.parent || !detail.parentId) return detail;
  // The detail payload carries only the parent's id — resolve its name/slug.
  const all = await getCategories(locale);
  const parent = all.find((c) => c.id === detail.parentId);
  return { ...detail, parent: parent ? { slug: parent.slug, name: parent.name } : null };
}

export async function getPartsBrand(locale: string, slug: string): Promise<PartsBrandDetail | null> {
  "use cache";
  cacheTag(TAGS.brands, TAGS.brand(slug));
  cacheLife("hours");
  if (!usable(slug)) return null;
  return fetchDetail(`/site/brands/${encodeURIComponent(slug)}/`, locale, mapPartsBrandDetail);
}

export async function getPart(locale: string, slug: string): Promise<PartDetail | null> {
  "use cache";
  cacheTag(TAGS.products, TAGS.product(slug));
  cacheLife("hours");
  if (!usable(slug)) return null;
  return fetchDetail(`/site/products/${encodeURIComponent(slug)}/`, locale, mapPartDetail);
}

/**
 * Every active part matching one base filter (a category, a parts brand or
 * a machine model), for server-side facet filtering, sorting and paging.
 * The products endpoint serves 25 rows a page and has no stock filter, so
 * the set is loaded once per base filter (cached) — capped at 40 pages
 * (1000 parts). Backend follow-up: `in_stock` filter + `page_size`.
 */
export async function getAllParts(
  locale: string,
  base: { category?: string; brand?: string; machineModel?: string; machineBrand?: string },
): Promise<PartSummary[]> {
  "use cache";
  cacheTag(
    TAGS.products,
    ...(base.category ? [TAGS.category(base.category)] : []),
    ...(base.brand ? [TAGS.brand(base.brand)] : []),
    ...(base.machineModel ? [TAGS.machineModel(base.machineModel)] : []),
    ...(base.machineBrand ? [TAGS.machineBrand(base.machineBrand)] : []),
  );
  const list = await fetchList(
    "/site/products/",
    locale,
    mapPart,
    {
      category__slug: base.category,
      brand__slug: base.brand,
      machine_models__slug: base.machineModel,
      machine_brands__slug: base.machineBrand,
      ordering: "name",
    },
    40,
  );
  if (list) cacheLife("hours");
  else cacheLife("minutes");
  return list ?? [];
}

/**
 * Slug index of the whole public catalogue (sitemap feed, or the list
 * endpoints before it is deployed). Used by generateStaticParams; the proxy
 * keeps its own in-memory copy (catalog-index-store.ts).
 */
export async function getCatalogIndex(): Promise<CatalogIndex | null> {
  "use cache";
  cacheTag(TAGS.sitemap, TAGS.products, TAGS.machines, TAGS.machineBrands, TAGS.machineModels, TAGS.categories, TAGS.brands);
  const parsed = parseSitemapIndex(await tryFetch<unknown>("/site/sitemap-entries/", "en"));
  if (parsed) {
    cacheLife("hours");
    return parsed;
  }
  const raw = (d: unknown) => (d && typeof d === "object" ? (d as Raw) : null);
  const [machineBrands, machineModels, categories, brands] = await Promise.all([
    fetchList("/site/machine-brands/", "en", raw),
    fetchList("/site/machine-models/", "en", raw, { page_size: 500 }),
    fetchList("/site/categories/", "en", raw),
    fetchList("/site/brands/", "en", raw),
  ]);
  cacheLife("minutes");
  if (!machineBrands && !machineModels && !categories && !brands) return null;
  return indexFromLists({
    machineBrands: machineBrands ?? [],
    machineModels: machineModels ?? [],
    categories: categories ?? [],
    brands: brands ?? [],
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchParts(locale: string, rawQuery: string): Promise<SearchResults> {
  "use cache";
  cacheTag(TAGS.products);
  const query = rawQuery.trim().slice(0, 120);
  if (!query) {
    cacheLife("max");
    return { query, exact: null, parts: [], total: 0, machineModels: [], machineBrands: [], live: true };
  }

  // NEW endpoint: exact / alt part-number matches ranked first server-side.
  const res = await tryFetch<Raw>("/site/search/", locale, { q: query, limit: 48 });
  if (res && typeof res === "object" && Array.isArray(res.results)) {
    cacheLife("minutes");
    const all = mapList(res.results, mapPart);
    const exact = res.has_exact ? (all.find((p) => p.match === "exact") ?? all[0] ?? null) : null;
    return {
      query,
      exact,
      parts: exact ? all.filter((p) => p.slug !== exact.slug) : all,
      total: Number(res.count ?? all.length) || all.length,
      machineModels: mapList(res.machine_models, mapMachineModel),
      machineBrands: mapList(res.machine_brands, mapMachineBrand),
      live: true,
    };
  }

  // Fallback: DRF SearchFilter on products, exact match pinned client-side.
  const fallback = await tryFetch<unknown>("/site/products/", locale, { search: query, page_size: 48 });
  if (fallback) cacheLife("minutes");
  else cacheLife("seconds");
  const parts = fallback ? mapList(unwrapList(fallback as never), mapPart) : [];
  const key = normalizePartNumber(query);
  const exact =
    parts.find((p) => p.partNumber && normalizePartNumber(p.partNumber) === key) ?? null;
  return {
    query,
    exact,
    parts: exact ? parts.filter((p) => p.slug !== exact.slug) : parts,
    total: parts.length,
    machineModels: [],
    machineBrands: [],
    live: fallback !== null,
  };
}

// ─── Sitemap feed ────────────────────────────────────────────────────────────

/**
 * GET /api/site/sitemap-entries/ for the sitemaps and llms.txt. null when the
 * backend is unreachable (or the endpoint isn't deployed yet) — callers then
 * list static pages only, and the short cacheLife lets them heal quickly.
 * Revalidated by `sitemap` and by every entity tag the backend sends.
 */
export async function getSitemapFeed(): Promise<SitemapFeed | null> {
  "use cache";
  cacheTag(TAGS.sitemap, TAGS.products, TAGS.machines, TAGS.machineBrands, TAGS.machineModels, TAGS.categories, TAGS.brands);
  const feed = parseSitemapFeed(await tryFetch<unknown>("/site/sitemap-entries/", "en"));
  if (feed) cacheLife("hours");
  else cacheLife("minutes");
  return feed;
}

// ─── Redirects (admin-managed; the proxy keeps its own copy — redirect-store.ts) ─

export async function getRedirects(): Promise<SiteRedirect[]> {
  "use cache";
  cacheTag(TAGS.redirects);
  // NEW endpoint.
  const data = await tryFetch<unknown>("/site/redirects/", "en");
  if (data) cacheLife("hours");
  else cacheLife("minutes");
  return parseRedirects(data);
}

// ─── RFQ (not cached — a write) ──────────────────────────────────────────────

/**
 * NEW endpoint POST /api/site/rfq/. Sends multipart when there are
 * attachments (items as a JSON string), JSON otherwise. Call from a route
 * handler / server action and pass the visitor IP as `forwardedFor`.
 * Throws ApiError (with field errors) on 4xx.
 */
export async function submitRfq(
  locale: string,
  input: RfqInput,
  opts: { forwardedFor?: string } = {},
): Promise<RfqReceipt> {
  const fields = {
    phone: input.phone,
    company_name: input.companyName ?? "",
    contact_name: input.contactName ?? "",
    email: input.email ?? "",
    bin_number: input.binNumber ?? "",
    delivery_area: input.deliveryArea ?? "",
    preferred_contact: input.preferredContact ?? "whatsapp",
    notes: input.notes ?? "",
    locale,
    website: input.website ?? "",
  };
  const items = input.items.map((i) => ({
    product: i.productSlug ?? "",
    part_number: i.partNumber ?? "",
    description: i.description ?? "",
    quantity: i.quantity ?? 1,
    machine_model: i.machineModel ?? "",
  }));

  let body: unknown;
  if (input.attachments?.length) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    fd.append("items", JSON.stringify(items));
    for (const f of input.attachments.slice(0, 5)) fd.append("attachments", f, f.name);
    body = fd;
  } else {
    body = { ...fields, items };
  }

  const data = await apiFetch<Raw>("/site/rfq/", {
    locale,
    method: "POST",
    timeoutMs: 30000,
    body,
    forwardedFor: opts.forwardedFor,
  });
  return {
    reference: typeof data?.reference === "string" ? data.reference : "",
    status: typeof data?.status === "string" ? data.status : "new",
    createdAt: typeof data?.created_at === "string" ? data.created_at : "",
    itemsCount: Number(data?.items_count) || 0,
    attachmentsCount: Number(data?.attachments_count) || 0,
  };
}
