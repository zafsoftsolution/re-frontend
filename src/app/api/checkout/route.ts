import { NextResponse, type NextRequest } from "next/server";
import { callDjango, clientIp, drfErrors, forwardHeaders, readJsonLimited, sameOrigin } from "@/lib/forms/forward";
import { ApiError } from "@/lib/api/client";
import { guestCheckoutBody, resolveLines } from "@/lib/forms/checkout";
import { checkoutRequestSchema, fieldErrors } from "@/lib/forms/schemas";

/**
 * POST /api/checkout — guest checkout for direct (priced) parts only.
 * Body: { values, items: [{ productSlug, qty }], locale }.
 * → 201 { ok, orderId, orderNumber }
 * → 400 { ok: false, code: "quote_only_product", products: [slug…] } — the
 *   client moves those lines to the quote list
 * → 422 { ok: false, code: "validation" | "rejected", fields?, detail? }
 *
 * Forwards the visitor IP; no internal secret (per-visitor throttle).
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers, request.url)) return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  const body = await readJsonLimited(request);
  if (body.tooLarge) return NextResponse.json({ ok: false, code: "too_large" }, { status: 413 });
  const raw = body.value;
  if (raw === undefined) return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  const parsed = checkoutRequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, code: "validation", fields: fieldErrors(parsed.error) }, { status: 422 });
  const { values, items, locale } = parsed.data;

  const ip = clientIp(request.headers);
  const userAgent = request.headers.get("user-agent");
  let lines;
  try {
    lines = await resolveLines(items.map((i) => i.productSlug), locale, { ip, userAgent });
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) return NextResponse.json({ ok: false, code: "throttled" }, { status: 429 });
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }
  const blocked = lines.filter((l) => !l.direct).map((l) => l.productSlug);
  if (blocked.length) return NextResponse.json({ ok: false, code: "quote_only_product", products: blocked }, { status: 400 });

  const bySlug = new Map(lines.map((l) => [l.productSlug, l]));
  const qty = new Map<string, number>();
  for (const i of items) qty.set(i.productSlug, Math.min(99, (qty.get(i.productSlug) ?? 0) + i.qty));
  const orderBody = guestCheckoutBody(
    values,
    [...qty].map(([slug, q]) => ({ id: bySlug.get(slug)!.id, qty: q })),
  );

  let res;
  try {
    res = await callDjango<Record<string, unknown>>("/inventory/guest-checkout/", {
      headers: forwardHeaders({ locale, ip, userAgent, json: true }),
      body: JSON.stringify(orderBody),
    });
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }

  if (res.ok && typeof res.data.id === "string") {
    return NextResponse.json({ ok: true, orderId: res.data.id, orderNumber: String(res.data.order_number ?? "") }, { status: 201 });
  }
  if (res.data.code === "quote_only_product") {
    const products = Array.isArray(res.data.products) ? res.data.products.filter((p): p is string => typeof p === "string") : [];
    return NextResponse.json({ ok: false, code: "quote_only_product", products }, { status: 400 });
  }
  if (res.status === 429) return NextResponse.json({ ok: false, code: "throttled" }, { status: 429 });
  if (res.status >= 400 && res.status < 500) {
    const fields = drfErrors(res.data);
    return NextResponse.json({ ok: false, code: "rejected", detail: fields.detail?.[0] ?? "", fields }, { status: 422 });
  }
  return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
}
