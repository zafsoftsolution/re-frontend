/**
 * Public-site domain types (camelCase). Django wire shapes live next to their
 * mappers in `mappers.ts`. Keep these minimal and add fields as pages need
 * them — every field here must be safe to render when the backend omits it.
 */

export type Availability =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "on_request"
  | "discontinued";

/** Effective per-product mode. "quote": price hidden, Add to quote.
 *  "direct": price shown, Add to cart (+ Add to quote for bulk). */
export type SalesMode = "quote" | "direct";

export interface SiteSettings {
  siteName: string;
  tagline: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  businessAddress: string;
  logoUrl: string;
  social: { facebook: string; instagram: string; youtube: string };
  codEnabled: boolean;
  /** Site-wide: "quote_only" (default) hides every price; "mixed" lets
   *  individual products be direct. */
  salesMode: "quote_only" | "mixed";
  /** True only when at least one product is direct — gates cart/checkout nav. */
  directOrdersEnabled: boolean;
  shipping: { flatFee: number; freeThreshold: number; codExtraFee: number };
  /** Admin-set site-wide SEO defaults (bootstrap `seo`). Empty = use messages. */
  seo: {
    title: string;
    description: string;
    /** e.g. "index,follow"; containing "noindex" switches the whole site off
     *  for crawlers (staging) — robots.txt `Disallow: /` + meta noindex. */
    defaultRobots: string;
    twitterHandle: string;
    ogImageUrl: string;
  };
  /** Search-console ownership tokens (bootstrap `verification`). */
  verification: { google: string; bing: string; pinterest: string; facebook: string };
  /** Tag ids (bootstrap `analytics`); nothing loads when both are empty. */
  analytics: { ga4: string; gtm: string };
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number;
  isFeatured: boolean;
  /** Parent category id (list endpoint) — "" for top-level. */
  parentId: string;
  children: { id: string; name: string; slug: string }[];
}

/** SEO fields shared by catalogue detail payloads (empty when unset). */
export interface SeoFields {
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
}

export interface CategoryDetail extends CategorySummary, SeoFields {
  bannerImage: string;
  /** Parent category (detail payload), null for top-level. */
  parent: { slug: string; name: string } | null;
}

export interface MachineTypeCount {
  machineType: string;
  label: string;
  count: number;
}

export interface MachineBrandSummary {
  id: string;
  name: string;
  slug: string;
  logo: string;
  country: string;
  isFeatured: boolean;
  modelCount: number;
  modelCountsByType: MachineTypeCount[];
}

export interface MachineBrandDetail extends MachineBrandSummary, SeoFields {
  description: string;
}

export interface MachineModelSummary {
  id: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName: string;
  machineType: string;
  machineTypeDisplay: string;
  partsCount: number;
}

export interface MachineModelDetail extends MachineModelSummary, SeoFields {
  description: string;
  image: string;
  brand: { slug: string; name: string; logo: string; country: string };
  /** Compatible active parts per category, most parts first. */
  categories: { slug: string; name: string; count: number }[];
}

export interface PartsBrandSummary {
  id: string;
  name: string;
  slug: string;
  logo: string;
  isOem: boolean;
  productCount: number;
}

export interface PartsBrandDetail extends PartsBrandSummary, SeoFields {
  description: string;
  machineBrandSlugs: string[];
}

export interface PartSummary {
  id: string;
  slug: string;
  name: string;
  sku: string;
  partNumber: string;
  categorySlug: string;
  categoryName: string;
  brandSlug: string;
  brandName: string;
  /** Parts brand is the genuine/OEM manufacturer. null = unknown. */
  brandIsOem: boolean | null;
  altPartNumbers: string[];
  minOrderQuantity: number;
  priceOnRequest: boolean;
  leadTimeDays: number | null;
  /** Compatible machine models (search results only). */
  fitsCount: number;
  /** Search match kind from /site/search/ ("exact", "alt", "text"…); "" elsewhere. */
  match: string;
  /** null for quote-only parts — the backend omits prices for them. */
  price: number | null;
  compareAtPrice: number | null;
  salesMode: SalesMode;
  currency: string;
  image: string;
  availability: Availability;
  availableQty: number;
  /** Compatible machine model / machine brand slugs (list payloads). */
  machineModelSlugs: string[];
  machineBrandSlugs: string[];
  /** ISO timestamp — used for "newest" sorting. */
  createdAt: string;
}

export interface PriceTier {
  minQuantity: number;
  unitPrice: number;
}

export interface PartDetail extends PartSummary, SeoFields {
  images: string[];
  description: string;
  shortDescription: string;
  /** Ordered [label, value] pairs from the `specifications` dict. */
  specifications: [string, string][];
  features: string[];
  category: { slug: string; name: string; parentSlug: string } | null;
  brand: { slug: string; name: string; isOem: boolean; description: string; logo: string } | null;
  machineModels: MachineModelSummary[];
  /** Direct parts only — always [] for quote parts (backend empties it too). */
  priceTiers: PriceTier[];
  relatedIds: string[];
  updatedAt: string;
}

/**
 * Slug sets for every public catalogue entity, from /site/sitemap-entries/
 * (or the list endpoints when that is unavailable). Drives
 * generateStaticParams and the proxy's real-404 guard.
 */
export interface CatalogIndex {
  machineBrands: string[];
  /** model slug → machine brand slug, plus parts count. */
  machineModels: { slug: string; brandSlug: string; partsCount: number }[];
  /** Model × category combos with ≥ 3 parts. */
  modelCategories: { brandSlug: string; modelSlug: string; categorySlug: string; count: number }[];
  categories: { slug: string; productCount: number }[];
  brands: { slug: string; productCount: number }[];
  parts: string[];
  /** false when a list could not be loaded completely (e.g. parts in the
   *  list-endpoint fallback) — the guard then confirms misses one by one. */
  complete: { parts: boolean; modelCategories: boolean };
}

export interface SiteBootstrap {
  settings: SiteSettings;
  categories: CategorySummary[];
  machineBrands: MachineBrandSummary[];
  partsBrands: PartsBrandSummary[];
  /** false when this came from the static fallback (backend unreachable). */
  live: boolean;
}

export interface SearchResults {
  query: string;
  /** Exact part-number hit, pinned above the rest. */
  exact: PartSummary | null;
  parts: PartSummary[];
  total: number;
  machineModels: MachineModelSummary[];
  machineBrands: MachineBrandSummary[];
  live: boolean;
}

/** GET /api/site/sitemap-entries/ — every indexable catalogue entity. */
export interface SitemapFeed {
  products: { slug: string; updatedAt: string | null; image: string }[];
  machineBrands: { slug: string; updatedAt: string | null; modelCount: number }[];
  machineModels: { slug: string; brandSlug: string; updatedAt: string | null; partsCount: number }[];
  modelCategories: { brandSlug: string; modelSlug: string; categorySlug: string; count: number }[];
  categories: { slug: string; parentSlug: string | null; updatedAt: string | null; productCount: number }[];
  brands: { slug: string; updatedAt: string | null; productCount: number; isOem: boolean }[];
}

export interface RfqItemInput {
  productSlug?: string;
  partNumber?: string;
  description?: string;
  quantity?: number;
  machineModel?: string;
}

export interface SiteRedirect {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302 | 307 | 308;
}

export interface RfqInput {
  companyName?: string;
  contactName?: string;
  phone: string;
  email?: string;
  binNumber?: string;
  deliveryArea?: string;
  preferredContact?: "whatsapp" | "call" | "email";
  notes?: string;
  items: RfqItemInput[];
  /** ≤5 files ≤10MB (xlsx, xls, csv, pdf, jpg, jpeg, png, webp). */
  attachments?: File[];
  /** Honeypot — must stay empty; bots fill it. */
  website?: string;
}

export interface RfqReceipt {
  reference: string;
  status: string;
  createdAt: string;
  itemsCount: number;
  attachmentsCount: number;
}
