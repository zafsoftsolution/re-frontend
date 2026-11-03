// ============================================================================
// RAKIB ENTERPRISE — Domain Types
// ============================================================================

export type Gender = "men" | "women" | "unisex" | "kids";

export type Fit = "regular" | "slim" | "relaxed" | "oversized" | "tailored";

export type ProductStatus = "active" | "draft" | "archived";

export interface ColorVariant {
  name: string;
  hex: string;
  /** image override for this color, optional */
  image?: string;
  stock?: Partial<Record<SizeLabel, number>>;
}

export type SizeLabel =
  | "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL"
  | "28" | "30" | "32" | "34" | "36" | "38" | "40" | "42"
  | "ONE";

export interface SizeVariant {
  label: SizeLabel;
  inStock: boolean;
  stock: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
  images?: string[];
  fit?: "small" | "true" | "large";
}

export type MachineType =
  | "lockstitch" | "overlock" | "flatlock" | "buttonhole" | "bartack"
  | "button_attach" | "feed_off_arm" | "multi_needle" | "blind_stitch"
  | "special" | "other";

/** A sewing-machine manufacturer (Juki, Brother, Yamato…). */
export interface MachineBrandRef {
  id?: string;
  name: string;
  slug: string;
  logo?: string;
  country?: string;
}

/** A specific machine model (Juki DDL-8700…). */
export interface MachineModelRef {
  id?: string;
  name: string;
  slug: string;
  machineType?: MachineType;
  machineTypeDisplay?: string;
  brandSlug?: string;
  brandName?: string;
}

export interface Product {
  id: string;
  sku: string;
  /** Manufacturer part / reference number. */
  partNumber?: string;
  name: string;
  slug: string;
  gender?: Gender;         // legacy apparel attribute, unused for parts
  category: string;        // slug (part type)
  categoryName?: string;
  subcategory?: string;    // slug
  brand: string;           // parts-brand slug
  brandName?: string;      // parts-brand name
  isOem?: boolean;         // genuine/OEM part
  /** Compatible machine-brand slugs (list endpoint). */
  machineBrands: string[];
  /** Compatible machine-model slugs (list endpoint). */
  machineModels: string[];
  /** Rich compatibility (detail endpoint). */
  machineBrandsDetail?: MachineBrandRef[];
  machineModelsDetail?: MachineModelRef[];
  collection?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;        // "BDT"
  images: string[];
  description: string;
  shortDescription?: string;
  material?: string;
  careInstructions?: string[];
  fit?: Fit;
  colors: ColorVariant[];
  sizes: SizeVariant[];
  tags: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isLimited?: boolean;
  status: ProductStatus;
  /** Total on-hand stock across warehouses. */
  stock?: number;
  rating: number;
  reviewCount: number;
  specifications?: Record<string, string>;
  features?: string[];
  relatedProducts?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender?: Gender;
  image: string;
  bannerImage?: string;
  productCount: number;
  subcategories?: Subcategory[];
  description?: string;
  featured?: boolean;
  order?: number;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  slug: string;
  description?: string;
  productCount: number;
  /** Parts brand: genuine/OEM vs aftermarket. */
  isOem?: boolean;
  /** Machine-brand slugs this parts brand supplies (scopes the admin form). */
  machineBrandSlugs?: string[];
  machineBrandIds?: string[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  season: string;         // "SS26", "FW25"
  description: string;
  heroImage: string;
  productIds: string[];
  launchDate: string;
}

export interface LookbookEntry {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  season: string;
  coverImage: string;
  images: string[];
  productIds: string[];
  description?: string;
  intro?: string;
  photographer?: string;
  stylist?: string;
  location?: string;
  date: string;
}

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful?: number;
  order?: number;
}

export interface CartItem {
  id: string;              // cart-line id
  productId: string;
  product: Product;
  quantity: number;
  selectedSize: SizeLabel;
  selectedColor: string;   // color name
  addedAt: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  couponCode?: string;
  updatedAt: string;
}

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  addresses: Address[];
  defaultAddressId?: string;
  orders: string[];        // order ids
  wishlist: string[];      // product ids
  loyaltyPoints: number;
  loyaltyTier: "silver" | "gold" | "platinum" | "obsidian";
  createdAt: string;
  emailVerified: boolean;
  marketingOptIn: boolean;
}

export type OrderStatus =
  | "pending_payment"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export interface OrderLineItem {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  size: SizeLabel;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderTimeline {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;     // "RE-26-000042"
  userId: string;
  status: OrderStatus;
  items: OrderLineItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  couponCode?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDelivery?: string;
  timeline: OrderTimeline[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  location: string;
  rating: number;
  quote: string;
  image?: string;
  date: string;
  verified: boolean;
}

export interface Coupon {
  code: string;
  type: "percent" | "fixed" | "shipping";
  value: number;
  minSpend?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  description?: string;
}

// Pagination + envelope types (used by API layer)
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: PageMeta;
  requestId: string;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
