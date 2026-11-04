import type { MetadataRoute } from "next";
import { getBootstrap } from "@/lib/api/site";
import { SITE_URL } from "@/lib/seo/jsonld";
import { robotsRules, siteNoindex } from "@/lib/seo/robots";

/** /robots.txt — rules in src/lib/seo/robots.ts. A `noindex` in the admin's
 *  default robots directive (staging) turns into `Disallow: /`. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const boot = await getBootstrap("en");
  return robotsRules(SITE_URL, { noindex: siteNoindex(boot.settings.seo.defaultRobots) });
}
