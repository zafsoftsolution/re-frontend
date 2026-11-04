/**
 * robots.txt rules. Pure so tests can check them; src/app/robots.ts feeds in
 * the admin's `seo.default_robots`.
 */
import type { MetadataRoute } from "next";

/** AI / answer-engine crawlers we explicitly welcome (catalogue is public). */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
] as const;

const PRIVATE = ["/admin", "/api/"];

/** Noindex utility pages, en + bn. (Prefix rules: "/search" also covers "/search?q=".) */
const UTILITY = ["/search", "/cart", "/checkout", "/rfq/sent", "/contact/thanks", "/machines/find"];

/**
 * Facet query params of catalogue listings (src/lib/catalog/listing.ts) —
 * those URLs are noindex with a canonical to the base listing, so keep
 * crawlers off the combinations. `?page=` stays crawlable (noindex, follow)
 * so deep parts are still reached by links; canonical pages never carry a
 * query string.
 */
const FACETS = ["machine", "mbrand", "brand", "category", "stock", "sort"].map((p) => `/*?*${p}=`);

export function disallowList(): string[] {
  const out = [...PRIVATE];
  for (const p of UTILITY) out.push(p, `/bn${p}`);
  out.push(...FACETS);
  return out;
}

/** True when the admin's default robots directive switches indexing off. */
export const siteNoindex = (defaultRobots: string) => /\bnoindex\b/i.test(defaultRobots);

export function robotsRules(siteUrl: string, opts: { noindex: boolean }): MetadataRoute.Robots {
  const host = new URL(siteUrl).host;
  if (opts.noindex) {
    // Staging / pre-launch switch: nothing is crawlable.
    return { rules: [{ userAgent: "*", disallow: "/" }], host };
  }
  const disallow = disallowList();
  // _next/ (scripts, CSS, optimised images) must stay fetchable for
  // rendering even though `/*?*…` facet rules would match /_next/image?….
  const allow = ["/", "/_next/"];
  return {
    rules: [
      { userAgent: "*", allow, disallow },
      // A crawler obeys only its most specific group, so each named group
      // repeats the disallows.
      { userAgent: [...AI_CRAWLERS], allow, disallow },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
