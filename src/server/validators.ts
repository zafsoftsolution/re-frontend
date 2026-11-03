import { z } from "zod";

// ────────── Auth ──────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  marketingOptIn: z.boolean().optional(),
});

// ────────── Products ──────────
export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  sort: z
    .enum(["featured", "newest", "price-asc", "price-desc", "rating", "popular"])
    .default("featured"),
  q: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  gender: z.enum(["men", "women", "unisex", "kids"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  colors: z.string().optional(),     // comma-separated color names
  sizes: z.string().optional(),      // comma-separated size labels
  onSale: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
});

// ────────── Cart ──────────
export const addToCartSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
});

export const updateCartSchema = z.object({
  lineId: z.string(),
  quantity: z.number().int().min(0).max(10),
});

// ────────── Orders ──────────
export const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postcode: z.string().min(2),
  country: z.string().min(2),
  phone: z.string().min(5),
});

export const addressInputSchema = addressSchema.extend({
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = addressInputSchema.partial();

// ────────── Profile ──────────
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  email: z.string().email(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(["card", "paypal", "apple-pay", "google-pay", "cod"]),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ────────── Reviews ──────────
export const reviewSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(80),
  comment: z.string().min(10).max(1500),
  fit: z.enum(["small", "true", "large"]).optional(),
});

// ────────── Newsletter / Contact ──────────
export const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10).max(2000),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(30),
});

// ────────── Admin ──────────
export const adminLoginSchema = loginSchema;

export const adminProductCreateSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(3),
  slug: z.string().min(2),
  gender: z.enum(["men", "women", "unisex", "kids"]),
  category: z.string(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  images: z.array(z.string().url()).min(1),
  description: z.string().min(10),
  material: z.string().min(2),
  fit: z.enum(["regular", "slim", "relaxed", "oversized", "tailored"]),
  colors: z
    .array(z.object({ name: z.string(), hex: z.string() }))
    .min(1),
  sizes: z
    .array(z.object({ label: z.string(), inStock: z.boolean(), stock: z.number().int().min(0) }))
    .min(1),
  tags: z.array(z.string()).default([]),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
});

export const adminProductUpdateSchema = adminProductCreateSchema.partial();

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function zodErrorToFields(err: z.ZodError) {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}
