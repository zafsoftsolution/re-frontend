import { GUIDES } from "@/content/guides";
import { getSitemapFeed } from "@/lib/api/site";
import { SITE_URL } from "@/lib/seo/jsonld";
import { childLastModified, EMPTY_FEED, sitemapEntries, sitemapIds, sitemapIndexXml } from "@/lib/seo/sitemap";

/**
 * /sitemap.xml (rewritten here in next.config.ts — Next's sitemap.ts owns
 * the /sitemap.xml route name) — the sitemap index robots.txt points to. Lists every
 * child sitemap that src/app/sitemap.ts serves at /sitemap/<id>.xml, with
 * the newest lastmod of its entries. Prerendered from the cached feed and
 * refreshed when the backend revalidates `sitemap` / entity tags.
 */
export async function GET() {
  const feed = (await getSitemapFeed()) ?? EMPTY_FEED;
  const guides = GUIDES.map((g) => ({ slug: g.slug, updated: g.updated }));
  const children = sitemapIds(feed).map((id) => ({
    id,
    lastModified: childLastModified(sitemapEntries(id, feed, { siteUrl: SITE_URL, guides }) ?? []),
  }));
  return new Response(sitemapIndexXml(SITE_URL, children), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
