import { NextResponse, type NextRequest } from "next/server";
import {
  callDjango,
  clientIp,
  djangoRfqBody,
  drfErrors,
  filesFromForm,
  forwardHeaders,
  RFQ_REFERENCE,
  rfqContactFromForm,
  rfqItemsFromForm,
  sameOrigin,
  sitePath,
} from "@/lib/forms/forward";
import { checkFiles, fieldErrors, RFQ_MAX_ITEMS, rfqContactSchema, rfqItemSchema } from "@/lib/forms/schemas";

/**
 * POST /api/rfq — quote request from /rfq, forwarded to Django
 * POST /api/site/rfq/ as multipart.
 *
 * Two callers:
 *  - the JS form (Accept: application/json) → JSON
 *    { ok: true, reference } | { ok: false, code, fields? }
 *  - the plain no-JS <form> → 303 to /rfq/sent?ref=… (or ?error=code)
 *
 * The visitor IP is forwarded in X-Forwarded-For and the internal secret is
 * NOT sent, so the backend's 10/hour RFQ throttle applies per visitor.
 */
export async function POST(request: NextRequest) {
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  let locale = "en";

  const reply = (status: number, body: { ok: boolean; code?: string; reference?: string; fields?: Record<string, string | string[]> }) => {
    if (wantsJson) return NextResponse.json(body, { status });
    const qs = body.ok ? `ref=${encodeURIComponent(body.reference ?? "")}` : `error=${encodeURIComponent(body.code ?? "failed")}`;
    return NextResponse.redirect(new URL(`${sitePath(locale, "/rfq/sent")}?${qs}`, request.url), 303);
  };

  if (!sameOrigin(request.headers, request.url)) return reply(403, { ok: false, code: "forbidden" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, code: "bad_request" });
  }
  locale = form.get("locale") === "bn" ? "bn" : "en";

  const contact = rfqContactSchema.safeParse(rfqContactFromForm(form));
  if (!contact.success) return reply(422, { ok: false, code: "validation", fields: fieldErrors(contact.error) });
  if (contact.data.website.trim()) return reply(400, { ok: false, code: "failed" }); // honeypot

  const rawItems = rfqItemsFromForm(form).slice(0, RFQ_MAX_ITEMS);
  const items = rawItems.map((i) => rfqItemSchema.safeParse(i)).flatMap((r) => (r.success ? [r.data] : []));
  const files = filesFromForm(form);
  const fileErrors = checkFiles(files);
  if (fileErrors.length) return reply(422, { ok: false, code: fileErrors[0].code, fields: { attachments: fileErrors.map((e) => e.code) } });
  if (!items.length && !files.length && !contact.data.notes) return reply(422, { ok: false, code: "empty" });

  const headers = forwardHeaders({ locale, ip: clientIp(request.headers), userAgent: request.headers.get("user-agent") });
  const send = (lines: typeof items) =>
    callDjango<Record<string, unknown>>("/site/rfq/", { headers, body: djangoRfqBody(contact.data, lines, files, locale), timeoutMs: 45_000 });

  let res;
  try {
    res = await send(items);
    // A part removed from the catalogue since it was added to the list must
    // not lose the whole request: resend those lines as free text.
    if (res.status === 400 && drfErrors(res.data).items && items.some((i) => i.productSlug)) {
      res = await send(items.map((i) => ({ ...i, productSlug: "" })));
    }
  } catch {
    return reply(502, { ok: false, code: "unavailable" });
  }

  if (res.ok) {
    const reference = typeof res.data.reference === "string" ? res.data.reference : "";
    if (!RFQ_REFERENCE.test(reference)) return reply(502, { ok: false, code: "unavailable" });
    return reply(201, { ok: true, reference });
  }
  if (res.status === 429) return reply(429, { ok: false, code: "throttled" });
  if (res.status >= 400 && res.status < 500) {
    const fields = drfErrors(res.data);
    const code = fields.attachments ? "file_rejected" : fields.phone ? "phone_invalid" : fields.items ? "items_rejected" : "failed";
    return reply(422, { ok: false, code, fields });
  }
  return reply(502, { ok: false, code: "unavailable" });
}
