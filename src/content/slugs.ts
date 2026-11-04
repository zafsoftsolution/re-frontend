/**
 * Slugs of the static content pages. Kept dependency-free so src/proxy.ts
 * can import it (unknown slugs → real 404). tests/unit/content.test.ts
 * checks these lists against the guide files and policy messages.
 */
export const POLICY_SLUGS = ["shipping", "returns", "payment", "privacy", "terms"] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

export const GUIDE_SLUGS = [
  "how-to-read-a-sewing-machine-part-number",
  "genuine-vs-compatible-parts",
  "industrial-needle-systems-and-sizes",
] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];

/**
 * Allowed second path segments per public section (anything deeper or not
 * listed is a 404).
 */
export const SUBPATHS: Record<string, readonly string[]> = {
  rfq: ["sent"],
  checkout: ["success"],
  contact: ["thanks"],
  cart: [],
  search: [],
  delivery: [],
  policies: POLICY_SLUGS,
  guides: GUIDE_SLUGS,
};
