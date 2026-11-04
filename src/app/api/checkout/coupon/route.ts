import { NextResponse, type NextRequest } from "next/server";
import { callDjango, clientIp, forwardHeaders } from "@/lib/forms/forward";

/**
 * GET /api/checkout/coupon?code=X → { valid, type, value, minSpend,
 * maxDiscount } from Django's coupons/validate/{code}/ — only the fields
 * the summary needs (not usage counts or eligibility lists).
 */
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{2,30}$/.test(code)) return NextResponse.json({ valid: false }, { status: 400 });
  try {
    const res = await callDjango<{ valid?: boolean; coupon?: Record<string, unknown> }>(
      `/inventory/coupons/validate/${encodeURIComponent(code)}/`,
      { method: "GET", headers: forwardHeaders({ locale: "en", ip: clientIp(request.headers) }), timeoutMs: 8000 },
    );
    if (!res.ok) return NextResponse.json({ valid: false }, { status: res.status === 404 ? 200 : res.status === 429 ? 429 : 502 });
    const c = res.data.coupon ?? {};
    const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
    return NextResponse.json(
      {
        valid: Boolean(res.data.valid),
        code: typeof c.code === "string" ? c.code : code,
        type: typeof c.type === "string" ? c.type : "",
        value: n(c.value),
        minSpend: n(c.min_spend),
        maxDiscount: n(c.max_discount),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ valid: false }, { status: 502 });
  }
}
