/**
 * Django (snake_case) → public-site types. Every mapper is tolerant: missing
 * or wrongly-typed fields fall back to safe empties, so a backend change or a
 * partially-deployed endpoint never crashes a render.
 */
import type {
  Availability,
  CategorySummary,
  MachineBrandSummary,
  MachineModelSummary,
  PartsBrandSummary,
  PartSummary,
  SiteSettings,
  SitemapEntry,
} from "./types";

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

/** First non-empty string among `keys`. */
export function str(o: Raw | undefined, ...keys: string[]): string {
  if (!o) return "";
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

export function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** null for missing/empty/non-numeric — never invent a 0 price. */
export function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = num(v, Number.NaN);
  return Number.isFinite(n) ? n : null;
}

const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export const FALLBACK_SETTINGS: SiteSettings = {
  siteName: "Rakib Enterprise",
  tagline: "",
  // Deliberately empty: never show a made-up phone number. Components hide
  // phone / WhatsApp affordances (or point to /contact) when these are blank.
  contactPhone: "",
  contactEmail: "",
  whatsappNumber: "",
  businessAddress: "",
  logoUrl: "",
  social: { facebook: "", instagram: "", youtube: "" },
  codEnabled: true,
  salesMode: "quote_only",
  directOrdersEnabled: false,
  shipping: { flatFee: 0, freeThreshold: 0, codExtraFee: 0 },
};

/**
 * Accepts both `/api/inventory/site-settings/` (flat) and the bootstrap
 * `settings` object (which may nest `social` / `shipping`).
 */
export function mapSettings(input: unknown): SiteSettings {
  if (!isObj(input)) return FALLBACK_SETTINGS;
  const social = isObj(input.social) ? input.social : input;
  const shipping = isObj(input.shipping) ? input.shipping : input;
  return {
    siteName: str(input, "site_name") || FALLBACK_SETTINGS.siteName,
    tagline: str(input, "tagline", "site_tagline"),
    contactPhone: str(input, "contact_phone", "phone"),
    contactEmail: str(input, "contact_email", "email"),
    whatsappNumber: str(input, "whatsapp_number", "whatsapp"),
    businessAddress: str(input, "business_address", "address"),
    logoUrl: str(input, "logo_url", "logo"),
    social: {
      facebook: str(social, "facebook_url", "facebook"),
      instagram: str(social, "instagram_url", "instagram"),
      youtube: str(social, "youtube_url", "youtube"),
    },
    codEnabled: bool(input.cod_enabled, true),
    salesMode: str(input, "sales_mode") === "mixed" ? "mixed" : "quote_only",
    directOrdersEnabled: bool(input.direct_orders_enabled, false),
    shipping: {
      flatFee: num(shipping.flat_shipping_fee ?? shipping.flat_fee),
      freeThreshold: num(shipping.free_shipping_threshold ?? shipping.free_threshold),
      codExtraFee: num(shipping.cod_extra_fee),
    },
  };
}

export function mapCategory(d: unknown): CategorySummary | null {
  if (!isObj(d) || !str(d, "slug")) return null;
  return {
    id: str(d, "id"),
    name: str(d, "name"),
    slug: str(d, "slug"),
    image: str(d, "image"),
    description: str(d, "description"),
    productCount: num(d.product_count),
    isFeatured: bool(d.is_featured),
    children: arr(d.children)
      .filter(isObj)
      .map((c) => ({ id: str(c, "id"), name: str(c, "name"), slug: str(c, "slug") }))
      .filter((c) => c.slug),
  };
}

export function mapMachineBrand(d: unknown): MachineBrandSummary | null {
  if (!isObj(d) || !str(d, "slug")) return null;
  return {
    id: str(d, "id"),
    name: str(d, "name"),
    slug: str(d, "slug"),
    logo: str(d, "logo"),
    country: str(d, "country"),
    isFeatured: bool(d.is_featured),
    modelCount: num(d.model_count),
    modelCountsByType: arr(d.model_counts_by_type)
      .filter(isObj)
      .map((t) => ({
        machineType: str(t, "machine_type"),
        label: str(t, "label"),
        count: num(t.count),
      })),
  };
}

export function mapMachineModel(d: unknown): MachineModelSummary | null {
  if (!isObj(d) || !str(d, "slug")) return null;
  return {
    id: str(d, "id"),
    name: str(d, "name"),
    slug: str(d, "slug"),
    brandSlug: str(d, "machine_brand_slug", "brand_slug"),
    brandName: str(d, "machine_brand_name", "brand_name"),
    machineType: str(d, "machine_type"),
    machineTypeDisplay: str(d, "machine_type_display"),
    partsCount: num(d.parts_count),
  };
}

export function mapPartsBrand(d: unknown): PartsBrandSummary | null {
  if (!isObj(d) || !str(d, "slug")) return null;
  return {
    id: str(d, "id"),
    name: str(d, "name"),
    slug: str(d, "slug"),
    logo: str(d, "logo"),
    isOem: bool(d.is_oem),
    productCount: num(d.product_count),
  };
}

const AVAILABILITY: readonly Availability[] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "on_request",
  "discontinued",
];

export function mapAvailability(d: Raw): Availability {
  const a = str(d, "availability");
  if ((AVAILABILITY as readonly string[]).includes(a)) return a as Availability;
  // Older list payloads only ship total_stock.
  return num(d.available_qty ?? d.total_stock) > 0 ? "in_stock" : "out_of_stock";
}

export function mapPart(d: unknown): PartSummary | null {
  if (!isObj(d) || !str(d, "slug")) return null;
  const category = isObj(d.category) ? d.category : undefined;
  const brand = isObj(d.brand) ? d.brand : undefined;
  const price = nullableNum(d.price);
  // Direct only when the backend says so AND actually sent a price.
  const salesMode = str(d, "sales_mode", "effective_sales_mode") === "direct" && price !== null ? "direct" : "quote";
  return {
    id: str(d, "id"),
    slug: str(d, "slug"),
    name: str(d, "name"),
    sku: str(d, "sku"),
    partNumber: str(d, "part_number"),
    categorySlug: category ? str(category, "slug") : str(d, "category"),
    categoryName: category ? str(category, "name") : str(d, "category_name"),
    brandSlug: brand ? str(brand, "slug") : str(d, "brand"),
    brandName: brand ? str(brand, "name") : str(d, "brand_name"),
    brandIsOem:
      typeof (brand?.is_oem ?? d.brand_is_oem) === "boolean" ? Boolean(brand?.is_oem ?? d.brand_is_oem) : null,
    altPartNumbers: arr(d.alt_part_numbers).filter((x): x is string => typeof x === "string" && x !== ""),
    minOrderQuantity: Math.max(1, num(d.min_order_quantity, 1)),
    priceOnRequest: bool(d.price_on_request, price === null),
    leadTimeDays: nullableNum(d.lead_time_days),
    fitsCount: num(d.fits_count),
    match: str(d, "match"),
    price: salesMode === "direct" ? price : null,
    compareAtPrice: salesMode === "direct" ? nullableNum(d.compare_at_price) : null,
    salesMode,
    currency: str(d, "currency") || "BDT",
    image: str({ i: arr(d.images)[0] }, "i") || str(d, "image"),
    availability: mapAvailability(d),
    availableQty: num(d.available_qty ?? d.total_stock),
  };
}

const SITEMAP_TYPES: readonly SitemapEntry["type"][] = [
  "part",
  "category",
  "machine_brand",
  "machine_model",
  "brand",
  "page",
];

export function mapSitemapEntry(d: unknown): SitemapEntry | null {
  if (!isObj(d)) return null;
  const path = str(d, "path", "url");
  if (!path) return null;
  const t = str(d, "type");
  return {
    type: (SITEMAP_TYPES as readonly string[]).includes(t) ? (t as SitemapEntry["type"]) : "page",
    path,
    lastModified: str(d, "last_modified", "lastmod", "updated_at") || null,
    images: arr(d.images).filter((x): x is string => typeof x === "string"),
  };
}

/** Map a list, dropping entries the mapper rejects. */
export function mapList<T>(items: unknown, mapper: (d: unknown) => T | null): T[] {
  return arr(items)
    .map(mapper)
    .filter((x): x is T => x !== null);
}
