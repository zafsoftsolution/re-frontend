import { NextResponse, type NextRequest } from "next/server";
import { callDjango, clientIp, forwardHeaders, sameOrigin, sitePath } from "@/lib/forms/forward";
import { contactSchema, fieldErrors } from "@/lib/forms/schemas";

const TOPIC_SUBJECT: Record<string, string> = {
  parts: "Parts enquiry",
  quote: "Quotation",
  order: "Order / delivery",
  other: "General",
};

/**
 * POST /api/contact — the /contact form → Django POST /api/site/contact/.
 * ContactSubmission has no phone field, so the phone goes into the subject
 * and the first line of the message. JSON for the JS form; 303 to
 * /contact/thanks (?status=error) for the no-JS form.
 */
export async function POST(request: NextRequest) {
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  let locale = "en";
  const reply = (status: number, body: { ok: boolean; code?: string; fields?: Record<string, string> }) =>
    wantsJson
      ? NextResponse.json(body, { status })
      : NextResponse.redirect(new URL(`${sitePath(locale, "/contact/thanks")}${body.ok ? "" : `?status=${encodeURIComponent(body.code ?? "failed")}`}`, request.url), 303);

  if (!sameOrigin(request.headers, request.url)) return reply(403, { ok: false, code: "forbidden" });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, code: "failed" });
  }
  locale = form.get("locale") === "bn" ? "bn" : "en";
  const s = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  const parsed = contactSchema.safeParse({ name: s("name"), phone: s("phone"), email: s("email"), topic: s("topic") || "parts", message: s("message"), website: s("website") });
  if (!parsed.success) return reply(422, { ok: false, code: "validation", fields: fieldErrors(parsed.error) });
  const v = parsed.data;
  if (v.website.trim()) return reply(400, { ok: false, code: "failed" }); // honeypot

  try {
    const res = await callDjango("/site/contact/", {
      headers: forwardHeaders({ locale, ip: clientIp(request.headers), userAgent: request.headers.get("user-agent"), json: true }),
      body: JSON.stringify({
        name: v.name,
        email: v.email,
        subject: `${TOPIC_SUBJECT[v.topic]} — ${v.phone}`.slice(0, 200),
        message: `Phone: ${v.phone}\nLanguage: ${locale}\n\n${v.message}`,
      }),
      timeoutMs: 15_000,
    });
    if (res.ok) return reply(201, { ok: true });
    if (res.status === 429) return reply(429, { ok: false, code: "throttled" });
    return reply(res.status >= 500 ? 502 : 422, { ok: false, code: res.status >= 500 ? "unavailable" : "failed" });
  } catch {
    return reply(502, { ok: false, code: "unavailable" });
  }
}
