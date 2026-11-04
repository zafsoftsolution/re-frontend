import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { isValidTag, TAGS } from "@/lib/api/tags";
import { markCatalogIndexStale } from "@/lib/api/catalog-index-store";
import { markRedirectsStale } from "@/lib/api/redirect-store";

/**
 * On-demand cache invalidation, called by the Django backend after content
 * changes:
 *
 *   POST /api/revalidate
 *   x-revalidate-secret: $REVALIDATE_SECRET
 *   { "tags": ["products", "product:juki-needle-db-x1"] }
 *
 * Uses stale-while-revalidate (`'max'`): the next visitor gets the old page
 * while the fresh one renders in the background.
 */
function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Upper bound on tags per request (bulk imports send one tag per entity). */
const MAX_TAGS = 2000;
const CHUNK = 100;
/** Tags whose change can add/remove/move catalogue slugs (proxy 404 guard). */
const INDEX_TAGS = new Set<string>([
  TAGS.sitemap,
  TAGS.products,
  TAGS.machines,
  TAGS.machineBrands,
  TAGS.machineModels,
  TAGS.categories,
  TAGS.brands,
]);

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ revalidated: false, error: "unauthorized" }, { status: 401 });
  }

  let tags: unknown;
  try {
    tags = ((await request.json()) as { tags?: unknown })?.tags;
  } catch {
    return Response.json({ revalidated: false, error: "invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    return Response.json({ revalidated: false, error: "body must be {tags: string[]}" }, { status: 400 });
  }
  const unique = [...new Set(tags.filter(isValidTag))];
  const invalid = tags.length - tags.filter(isValidTag).length;
  if (unique.length === 0) {
    return Response.json(
      { revalidated: false, error: "no valid tags (1–256 chars of [A-Za-z0-9_:.-])" },
      { status: 400 },
    );
  }
  if (unique.length > MAX_TAGS) {
    return Response.json(
      { revalidated: false, error: `too many distinct tags (max ${MAX_TAGS}); send a broad tag instead` },
      { status: 413 },
    );
  }

  // Chunked, yielding between chunks so a big import doesn't block the loop.
  for (let i = 0; i < unique.length; i += CHUNK) {
    for (const tag of unique.slice(i, i + CHUNK)) revalidateTag(tag, "max");
    if (i + CHUNK < unique.length) await new Promise((r) => setImmediate(r));
  }

  // The proxy's in-memory copies can't use cache tags — mark them stale.
  if (unique.some((t) => INDEX_TAGS.has(t) || t.includes(":"))) markCatalogIndexStale();
  if (unique.includes(TAGS.redirects)) markRedirectsStale();

  return Response.json({ revalidated: true, count: unique.length, ignored: invalid, now: Date.now() });
}
