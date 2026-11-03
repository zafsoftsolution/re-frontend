/**
 * Django (snake_case) → public-site types. Every mapper is tolerant: missing
 * or wrongly-typed fields fall back to safe empties, so a backend change or a
 * partially-deployed endpoint never crashes a render.
 */
import type {
  Availability,
  CategoryDetail,
  CategorySummary,
  MachineBrandDetail,
  MachineModelDetail,
  PartDetail,
  PartsBrandDetail,
  PriceTier,
  SeoFields,
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
    parentId: str(d, "parent"),
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
    fitsCount: num(d.fits_count) || arr(d.machine_models).length,
    match: str(d, "match"),
    price: salesMode === "direct" ? price : null,
    compareAtPrice: salesMode === "direct" ? nullableNum(d.compare_at_price) : null,
    salesMode,
    currency: str(d, "currency") || "BDT",
    image: str({ i: arr(d.images)[0] }, "i") || str(d, "image"),
    availability: mapAvailability(d),
    availableQty: num(d.available_qty ?? d.total_stock),
    machineModelSlugs: arr(d.machine_models)
      .map((m) => (typeof m === "string" ? m : isObj(m) ? str(m, "slug") : ""))
      .filter(Boolean),
    machineBrandSlugs: arr(d.machine_brands)
      .map((m) => (typeof m === "string" ? m : isObj(m) ? str(m, "slug") : ""))
      .filter(Boolean),
    createdAt: str(d, "created_at"),
  };
}

// ─── Detail payloads ─────────────────────────────────────────────────────────

function seo(d: Raw): SeoFields {
  return {
    seoTitle: str(d, "seo_title"),
    seoDescription: str(d, "seo_description"),
    ogImage: str(d, "og_image"),
  };
}

export function mapCategoryDetail(d: unknown): CategoryDetail | null {
  const base = mapCategory(d);
  if (!base || !isObj(d)) return null;
  const parent = isObj(d.parent) && str(d.parent, "slug") ? { slug: str(d.parent, "slug"), name: str(d.parent, "name") } : null;
  return { ...base, ...seo(d), bannerImage: str(d, "banner_image"), parent };
}

export function mapMachineBrandDetail(d: unknown): MachineBrandDetail | null {
  const base = mapMachineBrand(d);
  if (!base || !isObj(d)) return null;
  return { ...base, ...seo(d), description: str(d, "description") };
}

export function mapMachineModelDetail(d: unknown): MachineModelDetail | null {
  const base = mapMachineModel(d);
  if (!base || !isObj(d)) return null;
  const b = isObj(d.brand) ? d.brand : {};
  return {
    ...base,
    ...seo(d),
    brandSlug: base.brandSlug || str(b, "slug"),
    brandName: base.brandName || str(b, "name"),
    description: str(d, "description"),
    image: str(d, "image"),
    brand: {
      slug: str(b, "slug") || base.brandSlug,
      name: str(b, "name") || base.brandName,
      logo: str(b, "logo"),
      country: str(b, "country"),
    },
    categories: arr(d.categories)
      .filter(isObj)
      .map((c) => ({ slug: str(c, "slug"), name: str(c, "name"), count: num(c.count) }))
      .filter((c) => c.slug && c.count > 0),
  };
}

export function mapPartsBrandDetail(d: unknown): PartsBrandDetail | null {
  const base = mapPartsBrand(d);
  if (!base || !isObj(d)) return null;
  return {
    ...base,
    ...seo(d),
    description: str(d, "description"),
    machineBrandSlugs: arr(d.machine_brand_slugs).filter((x): x is string => typeof x === "string"),
  };
}

/** `specifications` may be a dict ({"Size": "#14"}) or a list of
 *  {label|name|key, value} rows. Values are stringified; empties dropped. */
export function mapSpecifications(v: unknown): [string, string][] {
  const out: [string, string][] = [];
  const push = (k: unknown, val: unknown) => {
    const key = typeof k === "string" ? k.trim() : "";
    const value =
      typeof val === "string" ? val.trim() : typeof val === "number" || typeof val === "boolean" ? String(val) : "";
    if (key && value) out.push([key, value]);
  };
  if (Array.isArray(v)) {
    for (const row of v) if (isObj(row)) push(row.label ?? row.name ?? row.key, row.value);
  } else if (isObj(v)) {
    for (const [k, val] of Object.entries(v)) push(k, val);
  }
  return out;
}

export function mapPartDetail(d: unknown): PartDetail | null {
  const base = mapPart(d);
  if (!base || !isObj(d)) return null;
  const category = isObj(d.category) ? d.category : null;
  const brand = isObj(d.brand) ? d.brand : null;
  const direct = base.salesMode === "direct";
  const tiers: PriceTier[] = direct
    ? arr(d.price_tiers)
        .filter(isObj)
        .map((t) => ({ minQuantity: num(t.min_quantity), unitPrice: nullableNum(t.unit_price) ?? Number.NaN }))
        .filter((t) => t.minQuantity > 0 && Number.isFinite(t.unitPrice))
        .sort((a, b) => a.minQuantity - b.minQuantity)
    : [];
  const images = arr(d.images).filter((x): x is string => typeof x === "string" && x.trim() !== "");
  const machineModels = mapList(d.machine_models, mapMachineModel);
  return {
    ...base,
    ...seo(d),
    fitsCount: machineModels.length || base.fitsCount,
    machineModelSlugs: machineModels.map((m) => m.slug),
    images,
    description: str(d, "description"),
    shortDescription: str(d, "short_description"),
    specifications: mapSpecifications(d.specifications),
    features: arr(d.features).filter((x): x is string => typeof x === "string" && x.trim() !== ""),
    category: category
      ? { slug: str(category, "slug"), name: str(category, "name"), parentSlug: isObj(category.parent) ? str(category.parent, "slug") : "" }
      : null,
    brand: brand
      ? {
          slug: str(brand, "slug"),
          name: str(brand, "name"),
          isOem: bool(brand.is_oem),
          description: str(brand, "description"),
          logo: str(brand, "logo"),
        }
      : null,
    machineModels,
    priceTiers: tiers,
    relatedIds: arr(d.related_product_ids).map(String),
    updatedAt: str(d, "updated_at"),
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
