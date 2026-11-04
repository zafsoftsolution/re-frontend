import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { isValidSlug } from "@/lib/api/catalog-index";
import { MAX_CART_LINES, resolveLines } from "@/lib/forms/checkout";
import { clientIp, readJsonLimited, sameOrigin } from "@/lib/forms/forward";

const bodySchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(200).refine(isValidSlug)).min(1).max(MAX_CART_LINES),
  locale: z.enum(["en", "bn"]).default("en"),
});

/**
 * POST /api/checkout/items { slugs, locale } → { lines: [{ productSlug,
 * name, partNumber, price, direct, availableQty, found }] } — current
 * backend prices and sales modes for the cart summary (the cart's stored
 * prices are display-only). Product UUIDs are not exposed.
 *
 * Same-origin only; one backend call for all slugs, sent as the visitor
 * (their IP, no internal secret) so the anonymous throttle applies.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers, request.url)) return NextResponse.json({ lines: [] }, { status: 403 });
  const body = await readJsonLimited(request);
  if (body.tooLarge) return NextResponse.json({ lines: [] }, { status: 413 });
  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ lines: [] }, { status: 400 });
  try {
    const lines = await resolveLines(parsed.data.slugs, parsed.data.locale, {
      ip: clientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(
      { lines: lines.map((l) => ({ productSlug: l.productSlug, name: l.name, partNumber: l.partNumber, price: l.price, direct: l.direct, availableQty: l.availableQty, found: l.found })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const throttled = err instanceof ApiError && err.status === 429;
    return NextResponse.json({ lines: null }, { status: throttled ? 429 : 502 });
  }
}
