/**
 * Sitemap builders. Pure (no Next runtime imports) so they run in unit tests;
 * src/app/sitemap.ts + src/app/sitemap.xml/route.ts wire them to the cached
 * backend feed (GET /api/site/sitemap-entries/).
 *
 * Layout:
 *   /sitemap.xml                 → <sitemapindex> of every child below
 *   /sitemap/pages.xml           → home, catalogue indexes, trust/content pages
 *   /sitemap/guides.xml          → /guides/<slug>
 *   /sitemap/machine-brands.xml  → /machines/<brand>
 *   /sitemap/machine-models.xml  → /machines/<brand>/<model>
 *   /sitemap/model-categories.xml→ /machines/<brand>/<model>/<category> (≥ 3 parts)
 *   /sitemap/categories.xml      → /categories/<slug>
 *   /sitemap/brands.xml          → /brands/<slug>
 *   /sitemap/parts-<n>.xml       → /parts/<slug>, PARTS_PER_SITEMAP parts each
 *
 * Every page is listed once per locale (en at /…, bn at /bn/…), each with
 * the full en/bn/x-default hreflang set — the same set the page's
 * <link rel="alternate"> tags carry (src/lib/seo/metadata.ts).
 * Search, RFQ-sent, cart, checkout, account, admin and filtered/paged
 * listing URLs are never listed (they are noindex).
 */
import type { MetadataRoute } from "next";
import type { SitemapFeed } from "@/lib/api/types";
import { MIN_MODEL_CATEGORY_PARTS } from "@/lib/api/catalog-index";
import { GUIDE_SLUGS, POLICY_SLUGS } from "@/content/slugs";

type Raw = Record<string, unknown>;
type Entry = MetadataRoute.Sitemap[number];

export const LOCALES = ["en", "bn"] as const;
export const DEFAULT_LOCALE = "en";

/** 5 000 parts × 2 locales = 10 000 <url> per file (limit is 50 000 / 50 MB). */
export const PARTS_PER_SITEMAP = 5000;

export const SITEMAP_KINDS = [
  "pages",
  "guides",
  "machine-brands",
  "machine-models",
  "model-categories",
  "categories",
  "brands",
] as const;
export type SitemapKind = (typeof SITEMAP_KINDS)[number];

/** Static, indexable, locale-less routes (no query strings). */
export const STATIC_PAGES = [
  "/",
  "/machines",
  "/categories",
  "/brands",
  "/rfq",
  "/about",
  "/contact",
  "/delivery",
  "/guides",
  "/policies",
  ...POLICY_SLUGS.map((s) => `/policies/${s}`),
] as const;

// ─── Feed parsing ────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const date = (v: unknown) => {
  const raw = s(v);
  return raw && !Number.isNaN(Date.parse(raw)) ? raw : null;
};
const rows = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObj) : []);

/** Tolerant parse of GET /api/site/sitemap-entries/; null if it isn't the feed. */
export function parseSitemapFeed(data: unknown): SitemapFeed | null {
  if (!isObj(data) || !Array.isArray(data.products) || !Array.isArray(data.machine_brands)) return null;
  return {
    products: rows(data.products)
      .map((p) => ({ slug: s(p.slug), updatedAt: date(p.updated_at), image: s(p.image) }))
      .filter((p) => p.slug),
    machineBrands: rows(data.machine_brands)
      .map((b) => ({ slug: s(b.slug), updatedAt: date(b.updated_at), modelCount: n(b.model_count) }))
      .filter((b) => b.slug),
    machineModels: rows(data.machine_models)
      .map((m) => ({ slug: s(m.slug), brandSlug: s(m.brand_slug), updatedAt: date(m.updated_at), partsCount: n(m.parts_count) }))
      .filter((m) => m.slug && m.brandSlug),
    modelCategories: rows(data.model_categories)
      .map((r) => ({ brandSlug: s(r.brand_slug), modelSlug: s(r.model_slug), categorySlug: s(r.category_slug), count: n(r.count) }))
      .filter((r) => r.brandSlug && r.modelSlug && r.categorySlug),
    categories: rows(data.categories)
      .map((c) => ({ slug: s(c.slug), parentSlug: s(c.parent_slug) || null, updatedAt: date(c.updated_at), productCount: n(c.product_count) }))
      .filter((c) => c.slug),
    brands: rows(data.brands)
      .map((b) => ({ slug: s(b.slug), updatedAt: date(b.updated_at), productCount: n(b.product_count), isOem: b.is_oem === true }))
      .filter((b) => b.slug),
  };
}

export const EMPTY_FEED: SitemapFeed = {
  products: [],
  machineBrands: [],
  machineModels: [],
  modelCategories: [],
  categories: [],
  brands: [],
};

// ─── URLs ────────────────────────────────────────────────────────────────────

/** "/machines" → "/bn/machines" (localePrefix "as-needed": en unprefixed). */
export function localizedPath(href: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Absolute, percent-encoded URL (unicode slugs) for a locale-prefixed path. */
export function absolute(siteUrl: string, path: string): string {
  return encodeURI(`${siteUrl}${path}`);
}

/** Next writes sitemap values verbatim — escape them for XML. */
export function xmlEscape(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** A slug as one path segment (never a separator); `absolute` percent-encodes it. */
const seg = (v: string) => v.replace(/[/?#]/g, "");

/** hreflang map for a locale-less href: en, bn, x-default → en. */
export function languagesFor(siteUrl: string, href: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l] = xmlEscape(absolute(siteUrl, localizedPath(href, l)));
  out["x-default"] = xmlEscape(absolute(siteUrl, localizedPath(href, DEFAULT_LOCALE)));
  return out;
}

/** One <url> per locale for a locale-less href. */
export function entriesForHref(
  siteUrl: string,
  href: string,
  opts: { lastModified?: string | null; images?: string[]; changeFrequency?: Entry["changeFrequency"]; priority?: number } = {},
): Entry[] {
  const languages = languagesFor(siteUrl, href);
  const images = (opts.images ?? []).filter((u) => /^https?:\/\//i.test(u)).map((u) => xmlEscape(encodeURI(decodeSafe(u))));
  return LOCALES.map((l) => ({
    url: xmlEscape(absolute(siteUrl, localizedPath(href, l))),
    ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
    ...(opts.changeFrequency ? { changeFrequency: opts.changeFrequency } : {}),
    ...(typeof opts.priority === "number" ? { priority: opts.priority } : {}),
    alternates: { languages },
    ...(images.length ? { images } : {}),
  }));
}

/** Decode once so already-encoded URLs (%20) aren't double-encoded by encodeURI. */
function decodeSafe(u: string): string {
  try {
    return decodeURI(u);
  } catch {
    return u;
  }
}

const latest = (dates: (string | null)[]): string | null => {
  let best: string | null = null;
  for (const d of dates) if (d && (!best || Date.parse(d) > Date.parse(best))) best = d;
  return best;
};

// ─── Ids ─────────────────────────────────────────────────────────────────────

/** Child sitemap ids. Always ≥ 1 parts file so the id set is stable. */
export function sitemapIds(feed: SitemapFeed): string[] {
  const partFiles = Math.max(1, Math.ceil(feed.products.length / PARTS_PER_SITEMAP));
  return [...SITEMAP_KINDS, ...Array.from({ length: partFiles }, (_, i) => `parts-${i}`)];
}

// ─── Entries per child sitemap ───────────────────────────────────────────────

export interface GuideStamp {
  slug: string;
  updated: string;
}

export function sitemapEntries(
  id: string,
  feed: SitemapFeed,
  ctx: { siteUrl: string; guides: GuideStamp[] },
): Entry[] | null {
  const { siteUrl } = ctx;
  const at = (href: string, o?: Parameters<typeof entriesForHref>[2]) => entriesForHref(siteUrl, href, o);

  const parts = /^parts-(\d+)$/.exec(id);
  if (parts) {
    const i = Number(parts[1]);
    const chunk = feed.products.slice(i * PARTS_PER_SITEMAP, (i + 1) * PARTS_PER_SITEMAP);
    if (i > 0 && chunk.length === 0) return null;
    return chunk.flatMap((p) =>
      at(`/parts/${seg(p.slug)}`, { lastModified: p.updatedAt, images: p.image ? [p.image] : [] }),
    );
  }

  switch (id as SitemapKind) {
    case "pages": {
      const modified: Record<string, string | null> = {
        "/": latest([
          ...feed.products.map((p) => p.updatedAt),
          ...feed.machineBrands.map((b) => b.updatedAt),
          ...feed.categories.map((c) => c.updatedAt),
        ]),
        "/machines": latest([...feed.machineBrands.map((b) => b.updatedAt), ...feed.machineModels.map((m) => m.updatedAt)]),
        "/categories": latest(feed.categories.map((c) => c.updatedAt)),
        "/brands": latest(feed.brands.map((b) => b.updatedAt)),
        "/guides": latest(ctx.guides.map((g) => g.updated)),
      };
      return STATIC_PAGES.flatMap((href) =>
        at(href, { lastModified: modified[href] ?? null, priority: href === "/" ? 1 : undefined }),
      );
    }
    case "guides":
      return ctx.guides
        .filter((g) => (GUIDE_SLUGS as readonly string[]).includes(g.slug))
        .flatMap((g) => at(`/guides/${g.slug}`, { lastModified: g.updated }));
    case "machine-brands":
      return feed.machineBrands.flatMap((b) => at(`/machines/${seg(b.slug)}`, { lastModified: b.updatedAt }));
    case "machine-models": {
      const brands = new Set(feed.machineBrands.map((b) => b.slug));
      return feed.machineModels
        .filter((m) => brands.has(m.brandSlug))
        .flatMap((m) => at(`/machines/${seg(m.brandSlug)}/${seg(m.slug)}`, { lastModified: m.updatedAt }));
    }
    case "model-categories": {
      const models = new Map(feed.machineModels.map((m) => [m.slug, m]));
      return feed.modelCategories
        .filter((r) => r.count >= MIN_MODEL_CATEGORY_PARTS && models.get(r.modelSlug)?.brandSlug === r.brandSlug)
        .flatMap((r) =>
          at(`/machines/${seg(r.brandSlug)}/${seg(r.modelSlug)}/${seg(r.categorySlug)}`, {
            lastModified: models.get(r.modelSlug)?.updatedAt ?? null,
          }),
        );
    }
    case "categories":
      return feed.categories.flatMap((c) => at(`/categories/${seg(c.slug)}`, { lastModified: c.updatedAt }));
    case "brands":
      return feed.brands.flatMap((b) => at(`/brands/${seg(b.slug)}`, { lastModified: b.updatedAt }));
    default:
      return null;
  }
}

/** Last-modified of a child sitemap (newest entry), for the index. */
export function childLastModified(entries: Entry[]): string | null {
  return latest(entries.map((e) => (typeof e.lastModified === "string" ? e.lastModified : e.lastModified?.toISOString() ?? null)));
}

/** <sitemapindex> XML for the child sitemap ids. */
export function sitemapIndexXml(siteUrl: string, children: { id: string; lastModified: string | null }[]): string {
  const items = children
    .map(
      (c) =>
        `<sitemap>\n<loc>${xmlEscape(`${siteUrl}/sitemap/${c.id}.xml`)}</loc>\n${c.lastModified ? `<lastmod>${xmlEscape(c.lastModified)}</lastmod>\n` : ""}</sitemap>\n`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}</sitemapindex>\n`;
}
