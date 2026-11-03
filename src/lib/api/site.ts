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
  mapList,
  mapMachineBrand,
  mapMachineModel,
  mapPart,
  mapPartsBrand,
  mapSettings,
  mapSitemapEntry,
} from "./mappers";
import { TAGS } from "./tags";
import type {
  CategorySummary,
  MachineBrandSummary,
  MachineModelSummary,
  PartsBrandSummary,
  PartSummary,
  RfqInput,
  RfqReceipt,
  SearchResults,
  SiteBootstrap,
  SitemapEntry,
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

async function fetchList<T>(
  path: string,
  locale: string,
  mapper: (d: unknown) => T | null,
  query?: Raw,
): Promise<T[] | null> {
  const data = await tryFetch<unknown>(path, locale, { page_size: 100, ...query });
  if (data === null) return null;
  return mapList(unwrapList(data as never), mapper);
}

// ─── Bootstrap (settings + top categories + machine brands) ─────────────────

export async function getBootstrap(locale: string): Promise<SiteBootstrap> {
  "use cache";
  cacheTag(TAGS.bootstrap, TAGS.settings, TAGS.categories, TAGS.machineBrands);

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
  cacheTag(TAGS.machineBrands);
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
  cacheTag(TAGS.machineModels, ...(brandSlug ? [TAGS.machineBrand(brandSlug)] : []));
  const list = await fetchList("/site/machine-models/", locale, mapMachineModel, {
    machine_brand__slug: brandSlug,
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

export async function getSitemapEntries(locale: string): Promise<SitemapEntry[]> {
  "use cache";
  cacheTag(TAGS.sitemap);
  // NEW endpoint.
  const data = await tryFetch<unknown>("/site/sitemap-entries/", locale);
  if (data) cacheLife("hours");
  else cacheLife("minutes");
  if (!data) return [];
  const list = Array.isArray(data) ? data : ((data as Raw).results ?? (data as Raw).entries);
  return mapList(list, mapSitemapEntry);
}

// ─── Redirects (admin-managed, consumed by proxy/next.config in Phase 2) ────

export async function getRedirects(): Promise<SiteRedirect[]> {
  "use cache";
  cacheTag(TAGS.redirects);
  // NEW endpoint.
  const data = await tryFetch<unknown>("/site/redirects/", "en");
  if (data) cacheLife("hours");
  else cacheLife("minutes");
  const list = Array.isArray(data) ? data : ((data as Raw | null)?.results ?? []);
  return (list as unknown[]).flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const o = r as Raw;
    const fromPath = typeof o.from_path === "string" ? o.from_path : "";
    const toPath = typeof o.to_path === "string" ? o.to_path : "";
    const code = Number(o.status_code);
    if (!fromPath.startsWith("/") || !toPath) return [];
    return [{ fromPath, toPath, statusCode: ([301, 302, 307, 308].includes(code) ? code : 301) as SiteRedirect["statusCode"] }];
  });
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
