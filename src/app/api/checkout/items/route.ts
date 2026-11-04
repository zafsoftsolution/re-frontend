import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveLines } from "@/lib/forms/checkout";

const bodySchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
  locale: z.enum(["en", "bn"]).default("en"),
});

/**
 * POST /api/checkout/items { slugs, locale } → { lines: [{ productSlug,
 * name, partNumber, price, direct, availableQty, found }] } — current
 * backend prices and sales modes for the cart summary (the cart's stored
 * prices are display-only). Product UUIDs are not exposed.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ lines: [] }, { status: 400 });
  try {
    const lines = await resolveLines(parsed.data.slugs, parsed.data.locale);
    return NextResponse.json(
      { lines: lines.map((l) => ({ productSlug: l.productSlug, name: l.name, partNumber: l.partNumber, price: l.price, direct: l.direct, availableQty: l.availableQty, found: l.found })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ lines: null }, { status: 502 });
  }
}
