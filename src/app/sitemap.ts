import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guides";
import { getSitemapFeed } from "@/lib/api/site";
import { SITE_URL } from "@/lib/seo/jsonld";
import { EMPTY_FEED, sitemapEntries, sitemapIds } from "@/lib/seo/sitemap";

/**
 * Child sitemaps at /sitemap/<id>.xml (pages, guides, machine-brands,
 * machine-models, model-categories, categories, brands, parts-0…). The index
 * that lists them is /sitemap.xml (src/app/sitemap-index.xml/route.ts + a rewrite) — Next
 * doesn't generate one for generateSitemaps. Layout: src/lib/seo/sitemap.ts.
 * Data comes from the cached feed (tags `sitemap` + entity tags), so a
 * backend revalidation refreshes them.
 */
export async function generateSitemaps() {
  const feed = (await getSitemapFeed()) ?? EMPTY_FEED;
  return sitemapIds(feed).map((id) => ({ id }));
}

const guides = GUIDES.map((g) => ({ slug: g.slug, updated: g.updated }));

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const [key, feed] = await Promise.all([id, getSitemapFeed()]);
  return sitemapEntries(key, feed ?? EMPTY_FEED, { siteUrl: SITE_URL, guides }) ?? [];
}
