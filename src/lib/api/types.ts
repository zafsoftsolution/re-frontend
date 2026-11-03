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
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number;
  isFeatured: boolean;
  children: { id: string; name: string; slug: string }[];
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

export interface PartsBrandSummary {
  id: string;
  name: string;
  slug: string;
  logo: string;
  isOem: boolean;
  productCount: number;
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

export interface SitemapEntry {
  type: "part" | "category" | "machine_brand" | "machine_model" | "brand" | "page";
  path: string;
  lastModified: string | null;
  images: string[];
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
