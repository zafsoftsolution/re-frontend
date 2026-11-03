import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { mapList, mapPart } from "@/lib/api/mappers";
import { TAGS } from "@/lib/api/tags";
import type { PartSummary } from "@/lib/api/types";

/**
 * Admin-edited Home copy from GET /api/site/home/ (HomeBlock rows, see
 * src/lib/admin/home-sections.ts for the kind ↔ section mapping):
 *   hero → hero copy · marquee → announcement strip · category_grid →
 *   part-type grid heading + picked categories · featured_edit → featured
 *   parts heading + picked parts · custom{section: machine_brands | rfq_band}.
 * Anything absent, inactive or empty falls back to messages / default data.
 *
 * HomeBlock text is English-first. The backend returns the active
 * language's value with an English fallback, so in bn a field is used only
 * when it actually contains Bangla — otherwise the bn messages win.
 */
export interface HomeCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  cta: { label: string; href: string } | null;
}

export interface HomeContent {
  hero: HomeCopy | null;
  announcement: HomeCopy | null;
  machineBrands: HomeCopy | null;
  categories: (HomeCopy & { categoryIds: string[] }) | null;
  parts: (HomeCopy & { picked: PartSummary[] }) | null;
  rfq: HomeCopy | null;
}

const EMPTY: HomeContent = { hero: null, announcement: null, machineBrands: null, categories: null, parts: null, rfq: null };

/** Tag the backend revalidates on every HomeBlock save. */
export const HOME_TAG = "home";

type Raw = Record<string, unknown>;
const BANGLA = /[ঀ-৿]/;

/** Public top-level sections (mirrors src/proxy.ts) — CTA hrefs elsewhere would 404. */
const SECTIONS = new Set(["", "machines", "parts", "categories", "brands", "search", "rfq", "about", "contact", "delivery", "guides", "policies"]);

export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (!h.startsWith("/") || h.startsWith("//")) return null;
  const section = h.split(/[/?#]/)[1] ?? "";
  return SECTIONS.has(section) ? h : null;
}

function copyOf(b: unknown, locale: string): HomeCopy | null {
  if (!b || typeof b !== "object") return null;
  const r = b as Raw;
  if (r.is_active === false) return null;
  const text = (k: string) => {
    const v = typeof r[k] === "string" ? (r[k] as string).trim() : "";
    return locale === "bn" && v && !BANGLA.test(v) ? "" : v;
  };
  const href = safeHref(r.cta_href);
  const label = text("cta_label");
  let title = text("title");
  let subtitle = text("subtitle");
  // Older blocks split one headline across title + subtitle ("Shop by" / "part type."):
  // a subtitle that starts lower-case continues the title.
  if (title && /^[a-z]/.test(subtitle)) {
    title = `${title} ${subtitle}`.replace(/\.$/, "");
    subtitle = "";
  }
  return {
    eyebrow: text("eyebrow"),
    title,
    subtitle,
    body: text("body"),
    cta: href && label ? { label, href } : null,
  };
}

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export async function getHomeContent(locale: string): Promise<HomeContent> {
  "use cache";
  cacheTag(HOME_TAG, TAGS.products, TAGS.categories);
  let data: Raw;
  try {
    data = await apiFetch<Raw>("/site/home/", { locale });
  } catch {
    cacheLife("minutes");
    return EMPTY;
  }
  cacheLife("hours");
  const blocks = (data.blocks && typeof data.blocks === "object" ? data.blocks : {}) as Raw;
  const custom = (Array.isArray(blocks.custom) ? blocks.custom : []) as Raw[];
  const marked = (section: string) =>
    custom.find((b) => (b.metadata as Raw | null)?.section === section && b.is_active !== false);

  const grid = first(blocks.category_grid) as Raw | undefined;
  const featured = first(blocks.featured_edit) as Raw | undefined;
  const gridCopy = copyOf(grid, locale);
  const featuredCopy = copyOf(featured, locale);
  // Only parts the admin picked; with none picked the backend falls back to
  // "is_featured" (max 4) — the page's own reader does that better.
  const picked = featured && ids(featured.featured_product_ids).length > 0 ? mapList(data.featured_edit_products, mapPart) : [];

  return {
    hero: copyOf(first(blocks.heroes ?? blocks.hero), locale),
    announcement: copyOf(first(blocks.marquee), locale),
    machineBrands: copyOf(marked("machine_brands"), locale),
    categories: gridCopy && { ...gridCopy, categoryIds: ids(grid?.featured_category_ids) },
    parts: featuredCopy && { ...featuredCopy, picked },
    rfq: copyOf(marked("rfq_band"), locale),
  };
}
