import { GUIDES } from "@/content/guides";
import { getBootstrap } from "@/lib/api/site";
import { SITE_URL } from "@/lib/seo/jsonld";
import { llmsTxt } from "@/lib/seo/llms";

/** /llms.txt — markdown brief for LLM agents (src/lib/seo/llms.ts). Cached
 *  with the bootstrap, so settings/catalogue revalidation refreshes it. */
export async function GET() {
  const boot = await getBootstrap("en");
  const body = llmsTxt({
    siteUrl: SITE_URL,
    boot,
    guides: GUIDES.map((g) => ({ slug: g.slug, title: g.en.title, description: g.en.description })),
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
