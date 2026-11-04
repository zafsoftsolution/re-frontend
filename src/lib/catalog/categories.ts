import type { CategorySummary } from "@/lib/api/types";

export interface CategoryNode {
  slug: string;
  name: string;
  /** Parts in the category itself plus its direct children. */
  total: number;
  /** Admin "device" flag, when the API sends it (see lib/catalog/devices.ts). */
  isDevice?: boolean;
  children: { slug: string; name: string; productCount: number }[];
}

/**
 * Top-level categories with their children, from the flat list endpoint
 * (children by `parent` id, or by the parent's `children` array when the
 * list payload doesn't carry `parent`). Keeps the backend's order.
 */
export function categoryTree(categories: CategorySummary[]): CategoryNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childSlugs = new Set<string>();
  for (const c of categories) {
    if (c.parentId && byId.has(c.parentId)) childSlugs.add(c.slug);
    for (const ch of c.children) childSlugs.add(ch.slug);
  }
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return categories
    .filter((c) => !childSlugs.has(c.slug))
    .map((c) => {
      const kids = new Map<string, { slug: string; name: string; productCount: number }>();
      for (const ch of c.children) kids.set(ch.slug, { slug: ch.slug, name: ch.name, productCount: bySlug.get(ch.slug)?.productCount ?? 0 });
      for (const x of categories) {
        if (x.parentId && x.parentId === c.id) kids.set(x.slug, { slug: x.slug, name: x.name, productCount: x.productCount });
      }
      const children = [...kids.values()];
      return {
        slug: c.slug,
        name: c.name,
        total: c.productCount + children.reduce((n, k) => n + k.productCount, 0),
        ...(c.isDevice !== undefined ? { isDevice: c.isDevice } : {}),
        children,
      };
    });
}
