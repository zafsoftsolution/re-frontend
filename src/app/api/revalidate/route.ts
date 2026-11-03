import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { isValidTag } from "@/lib/api/tags";

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
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > 100 || !tags.every(isValidTag)) {
    return Response.json(
      { revalidated: false, error: "body must be {tags: string[]} (1–100 tags of [A-Za-z0-9_:.-])" },
      { status: 400 },
    );
  }

  const unique = [...new Set(tags)];
  for (const tag of unique) revalidateTag(tag, "max");
  return Response.json({ revalidated: true, tags: unique, now: Date.now() });
}
