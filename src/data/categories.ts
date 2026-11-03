import type { Category } from "@/types";

export const categories: Category[] = [
  {
    id: "cat_001",
    name: "Outerwear",
    slug: "outerwear",
    image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=1200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=1920&q=80",
    productCount: 24,
    featured: true,
    order: 1,
    description: "Tailored coats, considered jackets, and signature layers.",
    subcategories: [
      { id: "sub_001", name: "Coats", slug: "coats", productCount: 8 },
      { id: "sub_002", name: "Blazers", slug: "blazers", productCount: 7 },
      { id: "sub_003", name: "Jackets", slug: "jackets", productCount: 9 },
    ],
  },
  {
    id: "cat_002",
    name: "Tailoring",
    slug: "tailoring",
    image: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=1920&q=80",
    productCount: 18,
    featured: true,
    order: 2,
    description: "Impeccable cuts. Quiet luxury in every seam.",
    subcategories: [
      { id: "sub_004", name: "Suits", slug: "suits", productCount: 6 },
      { id: "sub_005", name: "Trousers", slug: "trousers", productCount: 7 },
      { id: "sub_006", name: "Shirts", slug: "shirts", productCount: 5 },
    ],
  },
  {
    id: "cat_003",
    name: "Knitwear",
    slug: "knitwear",
    image: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=1200&q=80",
    productCount: 16,
    featured: true,
    order: 3,
    description: "Cashmere, wool and organic cotton — layered, always.",
  },
  {
    id: "cat_004",
    name: "Dresses",
    slug: "dresses",
    gender: "women",
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&q=80",
    productCount: 21,
    featured: true,
    order: 4,
    description: "Editorial dresses for every occasion.",
  },
  {
    id: "cat_005",
    name: "Denim",
    slug: "denim",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80",
    productCount: 14,
    order: 5,
    description: "Heavyweight selvedge, washed in small batches.",
  },
  {
    id: "cat_006",
    name: "Footwear",
    slug: "footwear",
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1200&q=80",
    productCount: 12,
    order: 6,
    description: "Hand-finished leather, made to be worn in.",
  },
  {
    id: "cat_007",
    name: "Accessories",
    slug: "accessories",
    image: "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=1200&q=80",
    productCount: 19,
    order: 7,
    description: "Bags, belts, scarves — the supporting cast.",
  },
  {
    id: "cat_008",
    name: "Essentials",
    slug: "essentials",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=80",
    productCount: 28,
    order: 8,
    description: "The core wardrobe, refined.",
  },
];

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getFeaturedCategories() {
  return categories.filter((c) => c.featured).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
