import { type NextRequest } from "next/server";
import { buildApiUrl, getApiRoot } from "@/lib/api/config";
import { UUID } from "@/lib/forms/forward";

/**
 * GET /api/checkout/invoice/{orderUuid} — same-origin proxy for Django's
 * orders/{id}/invoice-pdf/ (public by unguessable UUID), so the success page
 * link works with the internal backend URL and never exposes the API host.
 */

/** Plain fallback page — the order itself is placed; the invoice can be sent by staff. */
function unavailable() {
  return new Response(
    "The invoice PDF is not available right now. Your order is placed — we send the invoice with the order confirmation, or contact us on WhatsApp.\n\nইনভয়েস PDF এখন পাওয়া যাচ্ছে না। আপনার অর্ডার দেওয়া হয়েছে — অর্ডার নিশ্চিতকরণের সঙ্গে আমরা ইনভয়েস পাঠাব, অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।",
    { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "300" } },
  );
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/checkout/invoice/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  try {
    const res = await fetch(buildApiUrl(getApiRoot(), `/inventory/orders/${id}/invoice-pdf/`), {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 404) return new Response("Not found", { status: 404 });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) return unavailable();
    return new Response(res.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": res.headers.get("content-disposition") ?? `inline; filename="order-${id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return unavailable();
  }
}
