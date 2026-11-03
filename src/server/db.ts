/**
 * Rakib Enterprise Mock Database — an in-process store that behaves like a real repository.
 *
 * Notes:
 *  - Seed data is imported from /src/data/*; runtime changes live in memory
 *    for the life of the Node process (dev server). This is intentional: it's
 *    a mock, but it *acts* like a DB through a single access point.
 *  - All repositories below should be the ONLY way API routes read/write
 *    domain entities — never import /data directly from routes.
 */

import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import type {
  Brand,
  Category,
  Collection,
  Coupon,
  LookbookEntry,
  Order,
  Product,
  Review,
  Testimonial,
  User,
  FAQ,
} from "@/types";
import type { AdminUser } from "@/types/admin";

import { products as seedProducts } from "@/data/products";
import { categories as seedCategories } from "@/data/categories";
import { brands as seedBrands } from "@/data/brands";
import { faqs as seedFaqs } from "@/data/faq";
import { testimonials as seedTestimonials } from "@/data/testimonials";
import { lookbooks as seedLookbooks } from "@/data/lookbook";
import { collections as seedCollections } from "@/data/collections";

// ---------------------------------------------------------------------------
// Internal mutable tables
// ---------------------------------------------------------------------------

interface UserRecord extends User {
  passwordHash: string;
}

interface StoreShape {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  faqs: FAQ[];
  testimonials: Testimonial[];
  lookbooks: LookbookEntry[];
  collections: Collection[];
  users: UserRecord[];
  admins: (AdminUser & { passwordHash: string })[];
  orders: Order[];
  reviews: Review[];
  newsletter: { email: string; source?: string; at: string }[];
  contacts: { id: string; name: string; email: string; subject: string; message: string; at: string }[];
  coupons: Coupon[];
}

// Bump this whenever StoreShape gains/loses a key so the dev HMR singleton reseeds.
const DB_VERSION = 5;
const globalForDb = globalThis as unknown as {
  __jmnDb?: StoreShape;
  __jmnDbVersion?: number;
};

function seed(): StoreShape {
  // Default demo admin: admin@rakibenterprise-bd.com / admin1234
  const adminHash = bcrypt.hashSync("admin1234", 10);
  // Default demo customer: demo@rakibenterprise-bd.com / demo1234
  const userHash = bcrypt.hashSync("demo1234", 10);

  const demoUser: UserRecord = {
    id: "usr_demo",
    email: "demo@rakibenterprise-bd.com",
    firstName: "Demo",
    lastName: "Customer",
    name: "Demo Customer",
    passwordHash: userHash,
    addresses: [],
    orders: [],
    wishlist: [],
    loyaltyPoints: 480,
    loyaltyTier: "gold",
    createdAt: new Date("2025-10-01").toISOString(),
    emailVerified: true,
    marketingOptIn: true,
  };

  const demoAdmin: AdminUser & { passwordHash: string } = {
    id: "adm_root",
    email: "admin@rakibenterprise-bd.com",
    name: "House Admin",
    role: "super_admin",
    passwordHash: adminHash,
    roleCodes: ["super_admin"],
    permissions: ["*"],
    isSuperuser: true,
  };

  const coupons: Coupon[] = [
    {
      code: "WELCOME10",
      type: "percent",
      value: 10,
      minSpend: 100,
      maxDiscount: 100,
      validFrom: "2025-01-01",
      validUntil: "2026-12-31",
      usageLimit: 10_000,
      usedCount: 1248,
      active: true,
      description: "10% off your first order, $100 minimum.",
    },
    {
      code: "RE150",
      type: "shipping",
      value: 0,
      minSpend: 0,
      validFrom: "2025-01-01",
      validUntil: "2026-12-31",
      usedCount: 0,
      active: true,
      description: "Complimentary shipping.",
    },
    {
      code: "OBSIDIAN20",
      type: "percent",
      value: 20,
      minSpend: 500,
      validFrom: "2026-01-01",
      validUntil: "2026-06-30",
      usageLimit: 500,
      usedCount: 82,
      active: true,
      description: "Obsidian members — 20% off orders of $500+.",
    },
  ];

  return {
    products: [...seedProducts],
    categories: [...seedCategories],
    brands: [...seedBrands],
    faqs: [...seedFaqs],
    testimonials: [...seedTestimonials],
    lookbooks: [...seedLookbooks],
    collections: [...seedCollections],
    users: [demoUser],
    admins: [demoAdmin],
    orders: [],
    reviews: [],
    newsletter: [],
    contacts: [],
    coupons,
  };
}

function getOrSeedDb(): StoreShape {
  if (globalForDb.__jmnDb && globalForDb.__jmnDbVersion === DB_VERSION) {
    return globalForDb.__jmnDb;
  }
  const fresh = seed();
  globalForDb.__jmnDb = fresh;
  globalForDb.__jmnDbVersion = DB_VERSION;
  return fresh;
}

export const db: StoreShape = getOrSeedDb();

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export const productRepo = {
  findAll: () => [...db.products],
  findById: (id: string) => db.products.find((p) => p.id === id) ?? null,
  findBySlug: (slug: string) => db.products.find((p) => p.slug === slug) ?? null,
  insert: (p: Product) => { db.products.unshift(p); return p; },
  update: (id: string, patch: Partial<Product>) => {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    db.products[idx] = { ...db.products[idx], ...patch, updatedAt: new Date().toISOString() };
    return db.products[idx];
  },
  remove: (id: string) => {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    db.products.splice(idx, 1);
    return true;
  },
};

export const categoryRepo = {
  findAll: () => [...db.categories],
  findBySlug: (slug: string) => db.categories.find((c) => c.slug === slug) ?? null,
};

export const brandRepo = {
  findAll: () => [...db.brands],
  findBySlug: (slug: string) => db.brands.find((b) => b.slug === slug) ?? null,
};

export const userRepo = {
  findByEmail: (email: string) =>
    db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null,
  findById: (id: string) => db.users.find((u) => u.id === id) ?? null,
  insert: (u: UserRecord) => { db.users.push(u); return u; },
  update: (id: string, patch: Partial<UserRecord>) => {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...patch };
    return db.users[idx];
  },
  publicShape: (u: UserRecord): User => {
    const { passwordHash: _p, ...rest } = u;
    return rest;
  },
};

export const adminRepo = {
  findByEmail: (email: string) =>
    db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null,
  findById: (id: string) => db.admins.find((a) => a.id === id) ?? null,
  publicShape: (a: AdminUser & { passwordHash: string }): AdminUser => {
    const { passwordHash: _p, ...rest } = a;
    return rest;
  },
};

export const orderRepo = {
  findAll: () => [...db.orders],
  findByUser: (userId: string) => db.orders.filter((o) => o.userId === userId),
  findById: (id: string) => db.orders.find((o) => o.id === id || o.orderNumber === id) ?? null,
  insert: (o: Order) => { db.orders.unshift(o); return o; },
  update: (id: string, patch: Partial<Order>) => {
    const idx = db.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    db.orders[idx] = { ...db.orders[idx], ...patch, updatedAt: new Date().toISOString() };
    return db.orders[idx];
  },
  nextOrderNumber: () => {
    const n = db.orders.length + 1;
    return `RE-26-${String(n).padStart(6, "0")}`;
  },
};

export const reviewRepo = {
  findByProduct: (productId: string) =>
    db.reviews.filter((r) => r.productId === productId),
  insert: (r: Review) => { db.reviews.unshift(r); return r; },
  findAll: () => [...db.reviews],
};

export const newsletterRepo = {
  subscribe: (email: string, source?: string) => {
    const exists = db.newsletter.find((n) => n.email.toLowerCase() === email.toLowerCase());
    if (exists) return exists;
    const entry = { email, source, at: new Date().toISOString() };
    db.newsletter.push(entry);
    return entry;
  },
  all: () => [...db.newsletter],
};

export const contactRepo = {
  submit: (msg: Omit<StoreShape["contacts"][number], "id" | "at">) => {
    const entry = { ...msg, id: nanoid(12), at: new Date().toISOString() };
    db.contacts.push(entry);
    return entry;
  },
};

export const couponRepo = {
  findByCode: (code: string) =>
    db.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase()) ?? null,
  all: () => [...db.coupons],
};

export const faqRepo = {
  findAll: () => [...db.faqs].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
};

export const testimonialRepo = {
  findAll: () => [...db.testimonials],
};

export const lookbookRepo = {
  findAll: () => [...db.lookbooks],
  findBySlug: (slug: string) => db.lookbooks.find((l) => l.slug === slug) ?? null,
};

export const collectionRepo = {
  findAll: () => [...db.collections],
  findBySlug: (slug: string) => db.collections.find((c) => c.slug === slug) ?? null,
};
