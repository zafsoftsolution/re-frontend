/**
 * Storefront API client.
 *
 * Talks to the Django backend (`/api/site/*`, `/api/inventory/*`, `/api/auth/*`)
 * for every customer-facing page. Designed to work in three contexts:
 *
 *   1. Server components — `await storefront.products.list(...)` runs at
 *      request time on the Node.js server, with Next.js fetch caching.
 *   2. Client components — same calls work; auth header is auto-attached
 *      from localStorage when an access token is present.
 *   3. Route handlers — same.
 *
 * Mappers translate Django's snake_case payloads into the camelCase shapes
 * defined in `@/types`, so existing components keep working unchanged.
 */

import type {
  Address,
  Brand,
  Cart,
  CartItem,
  Category,
  Collection,
  ColorVariant,
  FAQ,
  LookbookEntry,
  MachineBrandRef,
  MachineModelRef,
  Order,
  OrderLineItem,
  OrderStatus,
  OrderTimeline,
  MachineType,
  Product,
  Review,
  SizeLabel,
  SizeVariant,
  Subcategory,
  Testimonial,
} from "@/types";
// Loyalty shapes are defined alongside the admin client because both ends
// share the exact wire format. Importing types is type-only so this doesn't
// pull any admin runtime into the storefront bundle.
import type {
  LoyaltyMeShape,
  LoyaltyRewardShape,
  LoyaltyTransactionShape,
  RewardRedemptionShape,
} from "@/lib/django-admin";

// ─────────────────────────────────────────────────────────────────────────────
// Base URL handling
// ─────────────────────────────────────────────────────────────────────────────

// Server-side (SSR / RSC inside the frontend container) prefers an internal
// URL that resolves on the Docker network (e.g. http://backend:8000). In the
// browser it falls back to the public NEXT_PUBLIC_* value. INTERNAL_DJANGO_BACKEND
// is unset locally, so non-Docker behaviour is unchanged.
const SERVER_ROOT =
  typeof window === "undefined" ? process.env.INTERNAL_DJANGO_BACKEND : undefined;

// `||` (not `??`) so an empty-string env var falls through to the next option.
const ROOT =
  SERVER_ROOT ||
  process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace(/\/api\/auth\/?$/, "") ||
  process.env.NEXT_PUBLIC_DJANGO_BACKEND ||
  "http://localhost:8000";

const API = `${ROOT}/api`;
const ACCESS_KEY = "jmn:django:access";

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class StorefrontError extends Error {
  status: number;
  fields: Record<string, string[]>;
  constructor(message: string, status: number, fields: Record<string, string[]>) {
    super(message);
    this.name = "StorefrontError";
    this.status = status;
    this.fields = fields;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch helper
// ─────────────────────────────────────────────────────────────────────────────

interface FetchInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, unknown>;
  /** Skip the JWT header even if a token is in localStorage. */
  anon?: boolean;
  /** Next.js fetch cache options for server components. */
  next?: { revalidate?: number; tags?: string[] };
}

async function request<T>(path: string, init: FetchInit = {}): Promise<T> {
  const { body, query, anon, next, headers: rawHeaders, ...rest } = init;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((rawHeaders as Record<string, string>) ?? {}),
  };

  // Attach JWT if we're in the browser, the caller didn't opt out, and a
  // token is available. Server components have no localStorage so this is a
  // no-op there.
  if (!anon && typeof window !== "undefined") {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Tell the backend which language to serve. Django's LocaleMiddleware
  // reads Accept-Language and django-modeltranslation returns the matching
  // _en / _bn columns. Cookie is the source of truth (set by LocaleProvider);
  // localStorage is the fallback when this runs from a server context.
  if (!headers["Accept-Language"]) {
    let locale = "en";
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
      if (m) locale = decodeURIComponent(m[1]);
    } else if (typeof window !== "undefined") {
      try {
        locale = localStorage.getItem("jmn:locale") || "en";
      } catch {
        /* ignore */
      }
    }
    headers["Accept-Language"] = locale;
  }

  let url = path.startsWith("http") ? path : `${API}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    serializedBody =
      typeof body === "string" || body instanceof FormData
        ? (body as BodyInit)
        : JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    body: serializedBody,
    next,
  });

  if (!res.ok) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = await res.json();
    } catch {
      /* not JSON */
    }
    const fields: Record<string, string[]> = {};
    let detail: string | undefined;
    for (const [k, v] of Object.entries(parsed)) {
      if (k === "detail" && typeof v === "string") detail = v;
      else if (Array.isArray(v)) fields[k] = v.map(String);
      else if (typeof v === "string") fields[k] = [v];
    }
    const message =
      detail ??
      Object.values(fields).flat().join("; ") ??
      `Request failed (${res.status})`;
    throw new StorefrontError(message || `Request failed`, res.status, fields);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface DRFPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Unwrap DRF's pagination envelope when present, otherwise pass through. */
function unwrap<T>(data: DRFPage<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mappers — Django (snake_case) → frontend (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

interface DjangoBrand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  is_oem?: boolean;
  machine_brands?: string[];
  machine_brand_slugs?: string[];
}

export function mapBrand(d: DjangoBrand & { product_count?: number }): Brand {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    logo: d.logo,
    description: d.description,
    productCount: d.product_count ?? 0,
    isOem: d.is_oem,
    machineBrandSlugs: d.machine_brand_slugs ?? undefined,
    machineBrandIds: d.machine_brands ?? undefined,
  };
}

export function mapMachineBrand(d: DjangoMachineBrand): MachineBrandRef & {
  modelCount?: number; description?: string; isFeatured?: boolean;
} {
  return {
    id: d.id, name: d.name, slug: d.slug, logo: d.logo, country: d.country,
    description: d.description, isFeatured: d.is_featured, modelCount: d.model_count,
  };
}

export function mapMachineModel(d: DjangoMachineModel): MachineModelRef {
  return {
    id: d.id, name: d.name, slug: d.slug,
    machineType: d.machine_type as MachineModelRef["machineType"],
    machineTypeDisplay: d.machine_type_display,
    brandSlug: d.machine_brand_slug, brandName: d.machine_brand_name,
  };
}

interface DjangoCategory {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  gender: string;
  image: string;
  banner_image: string;
  description: string;
  is_featured: boolean;
  order: number;
  children?: Array<{ id: string; name: string; slug: string }>;
}

export function mapCategory(d: DjangoCategory & { product_count?: number }): Category {
  const subs: Subcategory[] | undefined = d.children?.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: 0,
  }));
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    gender: (d.gender || undefined) as Category["gender"],
    image: d.image,
    bannerImage: d.banner_image || undefined,
    description: d.description || undefined,
    featured: d.is_featured,
    order: d.order,
    productCount: d.product_count ?? 0,
    subcategories: subs,
  };
}

interface DjangoCollection {
  id: string;
  name: string;
  slug: string;
  season: string;
  description: string;
  hero_image: string;
  launch_date: string;
}

export function mapCollection(d: DjangoCollection): Collection {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    season: d.season,
    description: d.description,
    heroImage: d.hero_image,
    productIds: [],
    launchDate: d.launch_date,
  };
}

interface DjangoLookbook {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  season: string;
  cover_image: string;
  images: string[];
  description: string;
  intro: string;
  photographer: string;
  stylist: string;
  location: string;
  date: string;
  product_ids: string[];
}

export function mapLookbook(d: DjangoLookbook): LookbookEntry {
  return {
    id: d.id,
    title: d.title,
    subtitle: d.subtitle || undefined,
    slug: d.slug,
    season: d.season,
    coverImage: d.cover_image,
    images: d.images ?? [],
    productIds: d.product_ids ?? [],
    description: d.description || undefined,
    intro: d.intro || undefined,
    photographer: d.photographer || undefined,
    stylist: d.stylist || undefined,
    location: d.location || undefined,
    date: d.date,
  };
}

interface DjangoColorVariant {
  id?: string;
  name: string;
  hex: string;
  image?: string;
  order?: number;
}

interface DjangoSizeVariant {
  id?: string;
  label: string;
  order?: number;
}

export interface DjangoMachineBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  country?: string;
  description?: string;
  is_active?: boolean;
  is_featured?: boolean;
  order?: number;
  model_count?: number;
}

export interface DjangoMachineModel {
  id: string;
  name: string;
  slug: string;
  machine_brand?: string;
  machine_brand_slug?: string;
  machine_brand_name?: string;
  machine_type?: string;
  machine_type_display?: string;
  description?: string;
  image?: string;
  order?: number;
}

interface DjangoProduct {
  id: string;
  sku: string;
  part_number?: string;
  name: string;
  slug: string;
  gender?: string;
  category: string | DjangoCategory;
  category_name?: string;
  brand: string | DjangoBrand | null;
  brand_name?: string | null;
  machine_brands?: (string | DjangoMachineBrand)[];
  machine_models?: (string | DjangoMachineModel)[];
  collection: string | DjangoCollection | null;
  price: string | number;
  compare_at_price: string | number | null;
  currency: string;
  images: string[];
  description: string;
  short_description: string;
  material?: string;
  care_instructions?: string[];
  fit?: string;
  colors?: DjangoColorVariant[];
  sizes?: DjangoSizeVariant[];
  tags: string[];
  is_new: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  is_limited: boolean;
  status: string;
  rating: string | number;
  review_count: number;
  total_stock?: number;
  /** Per-size availability — only present on the detail endpoint. */
  stock_by_size?: Record<string, number>;
  /**
   * Per (color, size) availability keyed as "color|size".
   * Only present on the detail endpoint.
   */
  stock_by_variant?: Record<string, number>;
  specifications?: Record<string, string>;
  features?: string[];
  related_product_ids?: string[];
  created_at: string;
  updated_at: string;
}

export function mapProduct(d: DjangoProduct): Product {
  const totalStock = d.total_stock ?? 0;
  const perSize = d.stock_by_size;
  const perVariant = d.stock_by_variant; // {"color|size": qty}
  const sizes: SizeVariant[] = (d.sizes ?? []).map((s) => {
    // Prefer per-size data when the backend provides it (detail endpoint).
    // Fall back to "any size in-stock if total > 0" for the list endpoint
    // which only ships an aggregate.
    if (perSize) {
      const qty = perSize[s.label] ?? 0;
      return {
        label: s.label as SizeLabel,
        inStock: qty > 0,
        stock: qty,
      };
    }
    return {
      label: s.label as SizeLabel,
      inStock: totalStock > 0,
      stock: totalStock > 0 ? totalStock : 0,
    };
  });

  const categorySlug =
    typeof d.category === "string" ? d.category : d.category?.slug ?? "";
  const brandSlug =
    typeof d.brand === "string"
      ? d.brand
      : d.brand && "slug" in d.brand
      ? d.brand.slug
      : "";
  const collectionSlug =
    typeof d.collection === "string"
      ? d.collection
      : d.collection && "slug" in d.collection
      ? d.collection.slug
      : undefined;

  // Compatibility: list endpoint sends slug strings; detail sends nested objects.
  const rawMB = d.machine_brands ?? [];
  const rawMM = d.machine_models ?? [];
  const machineBrands = rawMB.map((m) => (typeof m === "string" ? m : m.slug));
  const machineModels = rawMM.map((m) => (typeof m === "string" ? m : m.slug));
  const machineBrandsDetail = rawMB
    .filter((m): m is DjangoMachineBrand => typeof m !== "string")
    .map((m) => ({
      id: m.id, name: m.name, slug: m.slug, logo: m.logo, country: m.country,
    }));
  const machineModelsDetail = rawMM
    .filter((m): m is DjangoMachineModel => typeof m !== "string")
    .map((m) => ({
      id: m.id, name: m.name, slug: m.slug,
      machineType: m.machine_type as MachineType | undefined,
      machineTypeDisplay: m.machine_type_display,
      brandSlug: m.machine_brand_slug, brandName: m.machine_brand_name,
    }));
  const brandName =
    typeof d.brand === "object" && d.brand ? d.brand.name : d.brand_name ?? undefined;
  const isOem =
    typeof d.brand === "object" && d.brand && "is_oem" in d.brand
      ? (d.brand as { is_oem?: boolean }).is_oem
      : undefined;
  const categoryName =
    typeof d.category === "object" ? d.category?.name : d.category_name;

  return {
    id: d.id,
    sku: d.sku,
    partNumber: d.part_number || undefined,
    name: d.name,
    slug: d.slug,
    gender: (d.gender || undefined) as Product["gender"],
    category: categorySlug,
    categoryName,
    brand: brandSlug,
    brandName,
    isOem,
    machineBrands,
    machineModels,
    machineBrandsDetail: machineBrandsDetail.length ? machineBrandsDetail : undefined,
    machineModelsDetail: machineModelsDetail.length ? machineModelsDetail : undefined,
    collection: collectionSlug,
    price: num(d.price),
    compareAtPrice: d.compare_at_price ? num(d.compare_at_price) : undefined,
    currency: d.currency || "BDT",
    images: d.images ?? [],
    description: d.description ?? "",
    shortDescription: d.short_description || undefined,
    material: d.material ?? "",
    careInstructions: d.care_instructions ?? undefined,
    fit: d.fit as Product["fit"],
    colors: (d.colors ?? []).map((c) => {
      // When the backend ships per-(color,size) stock, attach the per-size
      // map to each color so the SizePicker can react to color selection.
      let stock: ColorVariant["stock"] | undefined;
      if (perVariant) {
        stock = {};
        for (const [k, qty] of Object.entries(perVariant)) {
          const [color, size] = k.split("|");
          if (color === c.name && size) {
            stock[size as SizeLabel] = qty;
          }
        }
      }
      return {
        name: c.name,
        hex: c.hex,
        image: c.image || undefined,
        stock,
      };
    }),
    sizes,
    tags: d.tags ?? [],
    isNew: d.is_new || undefined,
    isBestSeller: d.is_best_seller || undefined,
    isFeatured: d.is_featured || undefined,
    isLimited: d.is_limited || undefined,
    status: d.status as Product["status"],
    stock: d.total_stock ?? undefined,
    rating: num(d.rating),
    reviewCount: d.review_count ?? 0,
    specifications: d.specifications ?? undefined,
    features: d.features ?? undefined,
    relatedProducts: d.related_product_ids ?? undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

interface DjangoReview {
  id: string;
  product: string;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  fit: string;
  is_verified: boolean;
  helpful_count: number;
  images: string[];
  created_at: string;
}

export function mapReview(d: DjangoReview): Review {
  return {
    id: d.id,
    productId: d.product,
    userId: "",
    userName: d.user_name,
    rating: d.rating,
    title: d.title,
    comment: d.comment,
    date: d.created_at,
    verified: d.is_verified,
    helpful: d.helpful_count,
    images: d.images?.length ? d.images : undefined,
    fit: (d.fit || undefined) as Review["fit"],
  };
}

interface DjangoTestimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
  image: string;
  date: string;
  is_verified: boolean;
}

export function mapTestimonial(d: DjangoTestimonial): Testimonial {
  return {
    id: d.id,
    name: d.name,
    role: d.role || undefined,
    location: d.location,
    rating: d.rating,
    quote: d.quote,
    image: d.image || undefined,
    date: d.date,
    verified: d.is_verified,
  };
}

interface DjangoFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful_count: number;
  order: number;
}

export function mapFAQ(d: DjangoFAQ): FAQ {
  return {
    id: d.id,
    category: d.category,
    question: d.question,
    answer: d.answer,
    helpful: d.helpful_count,
    order: d.order,
  };
}

interface DjangoAddress {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

export function mapAddress(d: DjangoAddress): Address {
  return {
    id: d.id,
    firstName: d.first_name,
    lastName: d.last_name,
    company: d.company || undefined,
    line1: d.line1,
    line2: d.line2 || undefined,
    city: d.city,
    state: d.state || undefined,
    postcode: d.postcode,
    country: d.country,
    phone: d.phone,
    isDefault: d.is_default_shipping,
  };
}

interface DjangoCartItem {
  id: string;
  product: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  selected_color: string;
  selected_size: string;
  quantity: number;
  unit_price_snapshot: string | number;
  total: string | number;
  added_at: string;
}

interface DjangoCart {
  id: string;
  currency: string;
  items: DjangoCartItem[];
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  coupon_code: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function mapCart(d: DjangoCart, fallbackProducts?: Map<string, Product>): Cart {
  const items: CartItem[] = d.items.map((it) => {
    const product = fallbackProducts?.get(it.product);
    return {
      id: it.id,
      productId: it.product,
      product:
        product ??
        ({
          id: it.product,
          name: it.product_name,
          slug: it.product_slug,
          images: it.product_image ? [it.product_image] : [],
          price: num(it.unit_price_snapshot),
          currency: d.currency,
        } as Product),
      quantity: it.quantity,
      selectedSize: it.selected_size as SizeLabel,
      selectedColor: it.selected_color,
      addedAt: it.added_at,
    };
  });
  const subtotal = num(d.subtotal);
  const discount = num(d.discount);
  return {
    id: d.id,
    items,
    subtotal,
    discount,
    shipping: 0,
    tax: 0,
    total: num(d.total),
    currency: d.currency,
    couponCode: d.coupon_code ?? undefined,
    updatedAt: d.updated_at,
  };
}

interface DjangoOrderItem {
  id: string;
  product: string | null;
  product_name: string;
  product_image: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
}

interface DjangoOrderTimeline {
  id: string;
  status: string;
  note: string;
  at: string;
}

interface DjangoOrder {
  id: string;
  order_number: string;
  user: string | null;
  customer_email: string;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_address: Record<string, string>;
  billing_address: Record<string, string>;
  subtotal: string | number;
  discount: string | number;
  shipping: string | number;
  tax: string | number;
  total: string | number;
  currency: string;
  coupon_code: string;
  items: DjangoOrderItem[];
  timeline: DjangoOrderTimeline[];
  notes: string;
  placed_at: string;
  updated_at: string;
}

function mapJsonAddress(d: Record<string, string> | undefined): Address {
  const a = d ?? {};
  return {
    firstName: (a.first_name ?? a.firstName ?? "") as string,
    lastName: (a.last_name ?? a.lastName ?? "") as string,
    company: (a.company as string) || undefined,
    line1: (a.line1 ?? "") as string,
    line2: (a.line2 as string) || undefined,
    city: (a.city ?? "") as string,
    state: (a.state as string) || undefined,
    postcode: (a.postcode ?? "") as string,
    country: (a.country ?? "") as string,
    phone: (a.phone ?? "") as string,
  };
}

export function mapOrder(d: DjangoOrder): Order {
  const items: OrderLineItem[] = d.items.map((it) => ({
    productId: it.product ?? "",
    productName: it.product_name,
    productImage: it.product_image,
    sku: it.sku,
    size: it.size as SizeLabel,
    color: it.color,
    quantity: it.quantity,
    unitPrice: num(it.unit_price),
    total: num(it.total),
  }));
  const timeline: OrderTimeline[] = d.timeline.map((t) => ({
    status: t.status as OrderStatus,
    at: t.at,
    note: t.note || undefined,
  }));
  return {
    id: d.id,
    orderNumber: d.order_number,
    userId: d.user ?? "",
    status: d.status as OrderStatus,
    items,
    subtotal: num(d.subtotal),
    discount: num(d.discount),
    shipping: num(d.shipping),
    tax: num(d.tax),
    total: num(d.total),
    currency: d.currency,
    shippingAddress: mapJsonAddress(d.shipping_address),
    billingAddress: mapJsonAddress(d.billing_address),
    paymentMethod: d.payment_method,
    paymentStatus: d.payment_status as Order["paymentStatus"],
    couponCode: d.coupon_code || undefined,
    timeline,
    notes: d.notes || undefined,
    createdAt: d.placed_at,
    updatedAt: d.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public client surface
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductQuery {
  search?: string;
  status?: string;
  category?: string; // slug (part type)
  brand?: string; // parts-brand slug
  machineBrand?: string; // machine-brand slug
  machineModel?: string; // machine-model slug
  machineType?: string;
  minPrice?: number;
  maxPrice?: number;
  collection?: string; // slug
  is_featured?: boolean;
  is_new?: boolean;
  is_best_seller?: boolean;
  ordering?: string; // e.g. "-created_at", "price"
  page?: number;
  page_size?: number;
}

function productQuery(q: ProductQuery = {}): Record<string, unknown> {
  return {
    search: q.search,
    status: q.status,
    "category__slug": q.category,
    "brand__slug": q.brand,
    "machine_brands__slug": q.machineBrand,
    "machine_models__slug": q.machineModel,
    "machine_models__machine_type": q.machineType,
    "price__gte": q.minPrice,
    "price__lte": q.maxPrice,
    "collection__slug": q.collection,
    is_featured: q.is_featured,
    is_new: q.is_new,
    is_best_seller: q.is_best_seller,
    ordering: q.ordering,
    page: q.page,
    page_size: q.page_size,
  };
}

/** Shape returned by GET /site/products/facets/ */
export interface ProductFacets {
  machineBrands: Array<{
    id: string; name: string; slug: string; logo?: string; country?: string;
    models: Array<{ id: string; name: string; slug: string; machineType: string }>;
  }>;
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  partsBrands: Array<{ id: string; name: string; slug: string; isOem: boolean }>;
  machineTypes: Array<{ value: string; label: string }>;
  price: { min: number; max: number };
}

const SHORT_CACHE = { revalidate: 60 } as const; // 1 min for storefront browsing
const LONG_CACHE = { revalidate: 600 } as const; // 10 min for slow-moving content
const NO_CACHE = { cache: "no-store" as const };

export const storefront = {
  // ── Catalog ────────────────────────────────────────────────────────────────
  products: {
    async list(query: ProductQuery = {}): Promise<{ items: Product[]; total: number }> {
      const data = await request<DRFPage<DjangoProduct> | DjangoProduct[]>(
        "/site/products/",
        { query: productQuery(query), next: SHORT_CACHE },
      );
      const items = unwrap(data).map(mapProduct);
      const total = Array.isArray(data) ? items.length : data.count;
      return { items, total };
    },
    async get(slug: string): Promise<Product> {
      const d = await request<DjangoProduct>(`/site/products/${slug}/`, {
        next: SHORT_CACHE,
      });
      return mapProduct(d);
    },
    async reviews(slug: string): Promise<Review[]> {
      const data = await request<DjangoReview[]>(
        `/site/products/${slug}/reviews/`,
        { next: SHORT_CACHE },
      );
      return data.map(mapReview);
    },
    async facets(): Promise<ProductFacets> {
      const d = await request<{
        machine_brands: ProductFacets["machineBrands"];
        categories: ProductFacets["categories"];
        parts_brands: Array<{ id: string; name: string; slug: string; is_oem: boolean }>;
        machine_types: ProductFacets["machineTypes"];
        price: ProductFacets["price"];
      }>("/site/products/facets/", { next: SHORT_CACHE });
      return {
        machineBrands: d.machine_brands ?? [],
        categories: d.categories ?? [],
        partsBrands: (d.parts_brands ?? []).map((b) => ({
          id: b.id, name: b.name, slug: b.slug, isOem: b.is_oem,
        })),
        machineTypes: d.machine_types ?? [],
        price: d.price ?? { min: 0, max: 0 },
      };
    },
  },

  machineBrands: {
    async list(): Promise<ReturnType<typeof mapMachineBrand>[]> {
      const data = await request<DRFPage<DjangoMachineBrand> | DjangoMachineBrand[]>(
        "/site/machine-brands/", { next: LONG_CACHE },
      );
      return unwrap(data).map(mapMachineBrand);
    },
  },

  machineModels: {
    async list(machineBrandSlug?: string): Promise<MachineModelRef[]> {
      const data = await request<DRFPage<DjangoMachineModel> | DjangoMachineModel[]>(
        "/site/machine-models/",
        {
          query: machineBrandSlug ? { "machine_brand__slug": machineBrandSlug } : {},
          next: LONG_CACHE,
        },
      );
      return unwrap(data).map(mapMachineModel);
    },
  },

  categories: {
    async list(): Promise<Category[]> {
      const data = await request<DRFPage<DjangoCategory> | DjangoCategory[]>(
        "/site/categories/",
        { next: LONG_CACHE },
      );
      return unwrap(data).map(mapCategory);
    },
    async get(slug: string): Promise<Category> {
      const d = await request<DjangoCategory>(`/site/categories/${slug}/`, {
        next: LONG_CACHE,
      });
      return mapCategory(d);
    },
  },

  brands: {
    async list(): Promise<Brand[]> {
      const data = await request<DRFPage<DjangoBrand> | DjangoBrand[]>(
        "/site/brands/",
        { next: LONG_CACHE },
      );
      return unwrap(data).map(mapBrand);
    },
    async get(slug: string): Promise<Brand> {
      const d = await request<DjangoBrand>(`/site/brands/${slug}/`, {
        next: LONG_CACHE,
      });
      return mapBrand(d);
    },
  },

  collections: {
    async list(): Promise<Collection[]> {
      const data = await request<DRFPage<DjangoCollection> | DjangoCollection[]>(
        "/site/collections/",
        { next: LONG_CACHE },
      );
      return unwrap(data).map(mapCollection);
    },
    async get(slug: string): Promise<Collection> {
      const d = await request<DjangoCollection>(`/site/collections/${slug}/`, {
        next: LONG_CACHE,
      });
      return mapCollection(d);
    },
  },

  lookbooks: {
    async list(): Promise<LookbookEntry[]> {
      const data = await request<DRFPage<DjangoLookbook> | DjangoLookbook[]>(
        "/site/lookbooks/",
        { next: LONG_CACHE },
      );
      return unwrap(data).map(mapLookbook);
    },
    async get(slug: string): Promise<LookbookEntry> {
      const d = await request<DjangoLookbook>(`/site/lookbooks/${slug}/`, {
        next: LONG_CACHE,
      });
      return mapLookbook(d);
    },
  },

  // ── Reviews (write requires auth) ──────────────────────────────────────────
  reviews: {
    async create(data: {
      product: string;
      rating: number;
      title: string;
      comment: string;
      fit?: string;
    }): Promise<Review> {
      const d = await request<DjangoReview>("/site/reviews/", {
        method: "POST",
        body: data,
      });
      return mapReview(d);
    },
  },

  // ── Content ────────────────────────────────────────────────────────────────
  testimonials: {
    async list(): Promise<Testimonial[]> {
      const data = await request<DRFPage<DjangoTestimonial> | DjangoTestimonial[]>(
        "/site/testimonials/",
        { next: LONG_CACHE },
      );
      return unwrap(data).map(mapTestimonial);
    },
  },
  faqs: {
    async list(): Promise<FAQ[]> {
      const data = await request<DRFPage<DjangoFAQ> | DjangoFAQ[]>(
        "/site/faqs/",
        { next: LONG_CACHE },
      );
      return unwrap(data).map(mapFAQ);
    },
  },
  contact: {
    async submit(input: {
      name: string;
      email: string;
      subject: string;
      message: string;
    }): Promise<void> {
      await request("/site/contact/", {
        method: "POST",
        body: input,
        anon: true,
        ...NO_CACHE,
      });
    },
  },
  newsletter: {
    async subscribe(email: string, source = "footer"): Promise<void> {
      await request("/site/newsletter/", {
        method: "POST",
        body: { email, source },
        anon: true,
        ...NO_CACHE,
      });
    },
  },

  // ── Cart (auth required) ───────────────────────────────────────────────────
  cart: {
    async get(): Promise<Cart> {
      const d = await request<DjangoCart>("/inventory/cart/", NO_CACHE);
      return mapCart(d);
    },
    async clear(): Promise<Cart> {
      const d = await request<DjangoCart>("/inventory/cart/", {
        method: "DELETE",
        ...NO_CACHE,
      });
      return mapCart(d);
    },
    async add(input: {
      product: string;
      color: string;
      size: string;
      quantity?: number;
    }): Promise<Cart> {
      const d = await request<DjangoCart>("/inventory/cart/items/", {
        method: "POST",
        body: { quantity: 1, ...input },
        ...NO_CACHE,
      });
      return mapCart(d);
    },
    async update(lineId: string, quantity: number): Promise<Cart> {
      const d = await request<DjangoCart>("/inventory/cart/items/", {
        method: "PATCH",
        body: { id: lineId, quantity },
        ...NO_CACHE,
      });
      return mapCart(d);
    },
    async remove(lineId: string): Promise<Cart> {
      const d = await request<DjangoCart>(
        `/inventory/cart/items/?id=${encodeURIComponent(lineId)}`,
        { method: "DELETE", ...NO_CACHE },
      );
      return mapCart(d);
    },
    async applyCoupon(code: string | null): Promise<Cart> {
      const d = await request<DjangoCart>("/inventory/cart/coupon/", {
        method: "POST",
        body: { code: code ?? "" },
        ...NO_CACHE,
      });
      return mapCart(d);
    },
  },

  // ── Checkout ───────────────────────────────────────────────────────────────
  checkout: {
    async place(input: {
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: Address;
      billingAddress?: Address;
      paymentMethod: string;
      couponCode?: string;
      notes?: string;
    }): Promise<Order> {
      const body = {
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone || "",
        shipping_address: addressToJson(input.shippingAddress),
        billing_address: input.billingAddress
          ? addressToJson(input.billingAddress)
          : undefined,
        payment_method: input.paymentMethod,
        coupon_code: input.couponCode,
        notes: input.notes,
      };
      const d = await request<DjangoOrder>("/inventory/checkout/", {
        method: "POST",
        body,
        ...NO_CACHE,
      });
      return mapOrder(d);
    },

    /**
     * Guest-friendly checkout. Items are sent directly with the request — no
     * server-side cart, no login required. If the user happens to be signed
     * in, the JWT auth header is still attached automatically and the backend
     * will link the resulting order to their account.
     *
     * Phone is the primary contact channel and is required. Email is optional
     * — many shoppers don't have one and we don't want to block them.
     */
    async placeDirect(input: {
      customerPhone: string;
      customerEmail?: string;
      shippingAddress: Address;
      billingAddress?: Address;
      paymentMethod: string;
      couponCode?: string;
      notes?: string;
      currency?: string;
      items: Array<{
        productId: string;
        color: string;
        size: string;
        quantity: number;
      }>;
    }): Promise<Order> {
      const body = {
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail || "",
        shipping_address: addressToJson(input.shippingAddress),
        billing_address: input.billingAddress
          ? addressToJson(input.billingAddress)
          : undefined,
        payment_method: input.paymentMethod,
        coupon_code: input.couponCode,
        notes: input.notes,
        currency: input.currency,
        items: input.items.map((it) => ({
          product: it.productId,
          color: it.color,
          size: it.size,
          quantity: it.quantity,
        })),
      };
      const d = await request<DjangoOrder>("/inventory/guest-checkout/", {
        method: "POST",
        body,
        ...NO_CACHE,
      });
      return mapOrder(d);
    },
  },

  // ── Orders (auth required) ─────────────────────────────────────────────────
  orders: {
    async list(): Promise<Order[]> {
      const data = await request<DRFPage<DjangoOrder> | DjangoOrder[]>(
        "/inventory/orders/",
        NO_CACHE,
      );
      return unwrap(data).map(mapOrder);
    },
    async get(id: string): Promise<Order> {
      const d = await request<DjangoOrder>(`/inventory/orders/${id}/`, NO_CACHE);
      return mapOrder(d);
    },
  },

  // ── Customer addresses (auth required) ─────────────────────────────────────
  addresses: {
    async list(): Promise<Address[]> {
      const data = await request<DRFPage<DjangoAddress> | DjangoAddress[]>(
        "/inventory/addresses/",
        NO_CACHE,
      );
      return unwrap(data).map(mapAddress);
    },
    async create(input: Address): Promise<Address> {
      const d = await request<DjangoAddress>("/inventory/addresses/", {
        method: "POST",
        body: addressToJson(input),
        ...NO_CACHE,
      });
      return mapAddress(d);
    },
    async update(id: string, input: Partial<Address>): Promise<Address> {
      const d = await request<DjangoAddress>(`/inventory/addresses/${id}/`, {
        method: "PATCH",
        body: addressToJson(input as Address, true),
        ...NO_CACHE,
      });
      return mapAddress(d);
    },
    async delete(id: string): Promise<void> {
      await request<void>(`/inventory/addresses/${id}/`, {
        method: "DELETE",
        ...NO_CACHE,
      });
    },
    async setDefault(id: string): Promise<Address> {
      const d = await request<DjangoAddress>(
        `/inventory/addresses/${id}/set-default-shipping/`,
        { method: "POST", ...NO_CACHE },
      );
      return mapAddress(d);
    },
  },

  // ── Coupons (public read) ──────────────────────────────────────────────────
  coupons: {
    async validate(code: string): Promise<{ valid: boolean }> {
      return request<{ valid: boolean }>(
        `/inventory/coupons/validate/${encodeURIComponent(code)}/`,
        { anon: true, ...NO_CACHE },
      );
    },
  },

  // ── Loyalty (auth required) ────────────────────────────────────────────────
  loyalty: {
    async me(): Promise<LoyaltyMeShape> {
      return request<LoyaltyMeShape>("/loyalty/me/", NO_CACHE);
    },
    async transactions(
      page = 1,
      pageSize = 25,
    ): Promise<{ count: number; results: LoyaltyTransactionShape[] }> {
      return request<{ count: number; results: LoyaltyTransactionShape[] }>(
        "/loyalty/me/transactions/",
        { query: { page, page_size: pageSize }, ...NO_CACHE },
      );
    },
    async rewards(): Promise<LoyaltyRewardShape[]> {
      return request<LoyaltyRewardShape[]>("/loyalty/rewards/", NO_CACHE);
    },
    async redeem(rewardId: string): Promise<RewardRedemptionShape> {
      return request<RewardRedemptionShape>("/loyalty/redeem/", {
        method: "POST",
        body: { reward: rewardId },
        ...NO_CACHE,
      });
    },
  },

  // ── Homepage (full aggregated payload) ─────────────────────────────────────
  home: {
    async get(): Promise<HomePage> {
      // No cache — admin edits should land on the storefront immediately.
      // The page itself uses `dynamic = "force-dynamic"` so this matters.
      const d = await request<DjangoHomePagePayload>("/site/home/", NO_CACHE);
      return mapHomePage(d);
    },
  },
};

// ─── Homepage blocks ────────────────────────────────────────────────────────

export type HomeBlockKind =
  | "hero"
  | "marquee"
  | "category_grid"
  | "featured_edit"
  | "manifesto"
  | "new_arrivals"
  | "lookbook_feature"
  | "best_sellers"
  | "testimonials"
  | "newsletter_cta"
  | "custom";

export interface HomeBlock {
  id: string;
  kind: HomeBlockKind;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  secondaryImage: string;
  ctaLabel: string;
  ctaHref: string;
  textColor: string;
  linkedCollectionSlug: string | null;
  linkedLookbookSlug: string | null;
  featuredProductIds: string[];
  featuredCategoryIds: string[];
  order: number;
  metadata: Record<string, unknown>;
}

export interface HomeBlocks {
  heroes: HomeBlock[];
  marquee: HomeBlock[];
  categoryGrid: HomeBlock | null;
  featuredEdit: HomeBlock | null;
  manifesto: HomeBlock | null;
  newArrivals: HomeBlock | null;
  lookbookFeature: HomeBlock | null;
  bestSellers: HomeBlock | null;
  testimonials: HomeBlock | null;
  newsletterCta: HomeBlock | null;
  custom: HomeBlock[];
}

export interface HomePage {
  blocks: HomeBlocks;
  featuredEditProducts: Product[];
  newArrivals: Product[];
  bestSellers: Product[];
  categories: Category[];
  lookbooks: LookbookEntry[];
  testimonials: Testimonial[];
}

interface DjangoHomeBlock {
  id: string;
  kind: HomeBlockKind;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  secondary_image: string;
  cta_label: string;
  cta_href: string;
  text_color: string;
  linked_collection_slug: string | null;
  linked_lookbook_slug: string | null;
  featured_product_ids: string[];
  featured_category_ids: string[];
  order: number;
  metadata: Record<string, unknown>;
}

interface DjangoHomeBlocksPayload {
  heroes: DjangoHomeBlock[];
  marquee: DjangoHomeBlock[];
  category_grid: DjangoHomeBlock | null;
  featured_edit: DjangoHomeBlock | null;
  manifesto: DjangoHomeBlock | null;
  new_arrivals: DjangoHomeBlock | null;
  lookbook_feature: DjangoHomeBlock | null;
  best_sellers: DjangoHomeBlock | null;
  testimonials: DjangoHomeBlock | null;
  newsletter_cta: DjangoHomeBlock | null;
  custom: DjangoHomeBlock[];
}

interface DjangoHomePagePayload {
  blocks: DjangoHomeBlocksPayload;
  featured_edit_products: DjangoProduct[];
  new_arrivals: DjangoProduct[];
  best_sellers: DjangoProduct[];
  categories: Array<DjangoCategory & { product_count?: number }>;
  lookbooks: DjangoLookbook[];
  testimonials: DjangoTestimonial[];
}

function mapHomeBlock(d: DjangoHomeBlock): HomeBlock {
  return {
    id: d.id,
    kind: d.kind,
    name: d.name ?? "",
    eyebrow: d.eyebrow ?? "",
    title: d.title ?? "",
    subtitle: d.subtitle ?? "",
    body: d.body ?? "",
    image: d.image ?? "",
    secondaryImage: d.secondary_image ?? "",
    ctaLabel: d.cta_label ?? "",
    ctaHref: d.cta_href ?? "",
    textColor: d.text_color ?? "",
    linkedCollectionSlug: d.linked_collection_slug,
    linkedLookbookSlug: d.linked_lookbook_slug,
    featuredProductIds: d.featured_product_ids ?? [],
    featuredCategoryIds: d.featured_category_ids ?? [],
    order: d.order ?? 0,
    metadata: d.metadata ?? {},
  };
}

function mapHomeBlocks(d: DjangoHomeBlocksPayload | undefined): HomeBlocks {
  return {
    heroes: (d?.heroes ?? []).map(mapHomeBlock),
    marquee: (d?.marquee ?? []).map(mapHomeBlock),
    categoryGrid: d?.category_grid ? mapHomeBlock(d.category_grid) : null,
    featuredEdit: d?.featured_edit ? mapHomeBlock(d.featured_edit) : null,
    manifesto: d?.manifesto ? mapHomeBlock(d.manifesto) : null,
    newArrivals: d?.new_arrivals ? mapHomeBlock(d.new_arrivals) : null,
    lookbookFeature: d?.lookbook_feature ? mapHomeBlock(d.lookbook_feature) : null,
    bestSellers: d?.best_sellers ? mapHomeBlock(d.best_sellers) : null,
    testimonials: d?.testimonials ? mapHomeBlock(d.testimonials) : null,
    newsletterCta: d?.newsletter_cta ? mapHomeBlock(d.newsletter_cta) : null,
    custom: (d?.custom ?? []).map(mapHomeBlock),
  };
}

function mapHomePage(d: DjangoHomePagePayload): HomePage {
  return {
    blocks: mapHomeBlocks(d.blocks),
    featuredEditProducts: (d.featured_edit_products ?? []).map(mapProduct),
    newArrivals: (d.new_arrivals ?? []).map(mapProduct),
    bestSellers: (d.best_sellers ?? []).map(mapProduct),
    categories: (d.categories ?? []).map(mapCategory),
    lookbooks: (d.lookbooks ?? []).map(mapLookbook),
    testimonials: (d.testimonials ?? []).map(mapTestimonial),
  };
}

function addressToJson(a: Address, partial = false): Record<string, unknown> {
  const out: Record<string, unknown> = {
    first_name: a.firstName,
    last_name: a.lastName,
    company: a.company || "",
    line1: a.line1,
    line2: a.line2 || "",
    city: a.city,
    state: a.state || "",
    postcode: a.postcode,
    country: a.country,
    phone: a.phone || "",
  };
  if (partial) {
    for (const k of Object.keys(out)) {
      if (out[k] === undefined) delete out[k];
    }
  }
  return out;
}
