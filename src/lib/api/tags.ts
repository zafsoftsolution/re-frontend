/**
 * Cache tags shared by `'use cache'` readers and POST /api/revalidate.
 * The backend sends these strings when content changes, so treat them as a
 * public contract — rename only together with the Django signal handlers.
 */
export const TAGS = {
  bootstrap: "bootstrap",
  settings: "settings",
  categories: "categories",
  machineBrands: "machine-brands",
  machineModels: "machine-models",
  brands: "brands",
  products: "products",
  sitemap: "sitemap",
  redirects: "redirects",
  product: (slug: string) => `product:${slug}`,
  category: (slug: string) => `category:${slug}`,
  machineBrand: (slug: string) => `machine-brand:${slug}`,
  machineModel: (slug: string) => `machine-model:${slug}`,
} as const;

/** Next rejects tags over 256 chars; also guards the revalidate endpoint. */
export function isValidTag(tag: unknown): tag is string {
  return typeof tag === "string" && tag.length > 0 && tag.length <= 256 && /^[\w:.-]+$/.test(tag);
}
