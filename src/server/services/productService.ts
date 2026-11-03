import type { Product } from "@/types";
import { productRepo } from "../db";
import type { ProductQuery } from "../validators";

const normalize = (s: string) => s.toLowerCase().trim();

export const productService = {
  search(query: Partial<ProductQuery>): Product[] {
    let list = productRepo.findAll().filter((p) => p.status === "active");

    if (query.q) {
      const q = normalize(query.q);
      list = list.filter((p) =>
        [p.name, p.description, p.material, ...(p.tags ?? [])]
          .filter(Boolean)
          .some((text) => normalize(String(text)).includes(q))
      );
    }
    if (query.category) list = list.filter((p) => p.category === query.category);
    if (query.subcategory) list = list.filter((p) => p.subcategory === query.subcategory);
    if (query.brand) list = list.filter((p) => p.brand === query.brand);
    if (query.gender) list = list.filter((p) => p.gender === query.gender || p.gender === "unisex");
    if (query.minPrice != null) list = list.filter((p) => p.price >= query.minPrice!);
    if (query.maxPrice != null) list = list.filter((p) => p.price <= query.maxPrice!);
    if (query.onSale) list = list.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    if (query.inStock) list = list.filter((p) => p.sizes.some((s) => s.inStock));

    if (query.colors) {
      const wanted = query.colors.split(",").map((c) => c.toLowerCase().trim());
      list = list.filter((p) =>
        p.colors.some((c) => wanted.includes(c.name.toLowerCase()))
      );
    }
    if (query.sizes) {
      const wanted = query.sizes.split(",").map((s) => s.toUpperCase().trim());
      list = list.filter((p) =>
        p.sizes.some((s) => wanted.includes(String(s.label).toUpperCase()) && s.inStock)
      );
    }

    switch (query.sort) {
      case "newest":
        list = list.slice().sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1));
        break;
      case "price-asc":
        list = list.slice().sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = list.slice().sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = list.slice().sort((a, b) => b.rating - a.rating);
        break;
      case "popular":
        list = list.slice().sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "featured":
      default:
        list = list.slice().sort((a, b) => {
          const score = (p: Product) =>
            (p.isFeatured ? 100 : 0) + (p.isBestSeller ? 50 : 0) + (p.isNew ? 20 : 0) + p.rating;
          return score(b) - score(a);
        });
    }

    return list;
  },

  related(productId: string, limit = 4): Product[] {
    const p = productRepo.findById(productId);
    if (!p) return [];
    return productRepo
      .findAll()
      .filter((x) => x.id !== p.id && (x.category === p.category || x.collection === p.collection))
      .slice(0, limit);
  },

  facets() {
    const all = productRepo.findAll();
    const colors = new Map<string, { hex: string; count: number }>();
    const sizes = new Map<string, number>();
    const categories = new Map<string, number>();

    for (const p of all) {
      for (const c of p.colors) {
        const existing = colors.get(c.name);
        colors.set(c.name, { hex: c.hex, count: (existing?.count ?? 0) + 1 });
      }
      for (const s of p.sizes) {
        sizes.set(String(s.label), (sizes.get(String(s.label)) ?? 0) + 1);
      }
      categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
    }

    return {
      colors: Array.from(colors.entries()).map(([name, v]) => ({ name, ...v })),
      sizes: Array.from(sizes.entries()).map(([label, count]) => ({ label, count })),
      categories: Array.from(categories.entries()).map(([slug, count]) => ({ slug, count })),
      priceRange: {
        min: Math.min(...all.map((p) => p.price)),
        max: Math.max(...all.map((p) => p.price)),
      },
    };
  },
};
