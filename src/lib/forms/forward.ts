/**
 * Route-handler helpers for browser-originated writes proxied to Django
 * (RFQ, guest checkout, contact).
 *
 * These calls deliberately do NOT carry X-Internal-Secret: the backend's
 * per-visitor throttles (RFQ 10/hour, guest checkout, anon) must apply to
 * the buyer, not to the Next server. The buyer's IP goes in X-Forwarded-For.
 */
import { buildApiUrl, getApiRoot } from "@/lib/api/config";
import type { RfqItem } from "./schemas";

type HeaderLike = { get(name: string): string | null };

const IP = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Visitor address chain for X-Forwarded-For: the incoming X-Forwarded-For
 * as received (only well-formed IPs kept, max 5 hops), else X-Real-IP.
 * Django picks the right-most hop that is not one of its trusted proxies
 * (auth_app/utils.get_client_ip), so a forged left-most entry can't dodge
 * the per-visitor throttle. "" when unknown — Django then uses the socket
 * address.
 */
export function clientIp(headers: HeaderLike): string {
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter((h) => IP.test(h))
    .slice(-5);
  if (hops.length) return hops.join(", ");
  const real = headers.get("x-real-ip")?.trim() ?? "";
  return real && IP.test(real) ? real : "";
}

/** Headers for the Django call — never the internal secret. */
export function forwardHeaders(opts: { locale: string; ip?: string; userAgent?: string | null; json?: boolean }): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json", "Accept-Language": opts.locale };
  if (opts.json) h["Content-Type"] = "application/json";
  if (opts.ip) h["X-Forwarded-For"] = opts.ip;
  if (opts.userAgent) h["User-Agent"] = opts.userAgent.slice(0, 512);
  return h;
}

/**
 * Same-origin check for form posts: browsers send Origin on POST. A missing
 * Origin (old browsers, curl) is allowed — the backend throttles and the
 * honeypot still apply.
 */
export function sameOrigin(headers: HeaderLike, requestUrl: string): boolean {
  const origin = headers.get("origin");
  if (!origin || origin === "null") return true;
  try {
    const o = new URL(origin);
    const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? new URL(requestUrl).host;
    return o.host === host;
  } catch {
    return false;
  }
}

export interface DjangoResult<T = Record<string, unknown>> {
  status: number;
  ok: boolean;
  data: T;
}

/** POST/GET to Django without the internal secret. Never throws on HTTP errors. */
export async function callDjango<T = Record<string, unknown>>(
  path: string,
  init: { method?: "GET" | "POST"; headers: Record<string, string>; body?: BodyInit; timeoutMs?: number; query?: Record<string, string> },
): Promise<DjangoResult<T>> {
  const res = await fetch(buildApiUrl(getApiRoot(), path, init.query), {
    method: init.method ?? "POST",
    headers: init.headers,
    body: init.body,
    cache: "no-store",
    signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
  });
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  return { status: res.status, ok: res.ok, data: (data ?? {}) as T };
}

/** DRF error body → { field: ["msg"] } (+ "detail"). */
export function drfErrors(data: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = [v];
    else if (Array.isArray(v)) out[k] = v.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    else if (v && typeof v === "object") out[k] = [JSON.stringify(v)];
  }
  return out;
}

// ─── RFQ form parsing ───────────────────────────────────────────────────────

/**
 * Line items from an RFQ multipart body. The JS form sends `items` as a JSON
 * array; the no-JS form sends repeated `line_pn` / `line_desc` / `line_qty`
 * / `line_model` fields (blank rows are dropped).
 */
export function rfqItemsFromForm(form: FormData): Partial<RfqItem>[] {
  const json = form.get("items");
  if (typeof json === "string" && json.trim()) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x === "object") as Partial<RfqItem>[];
    } catch {
      /* fall through to the plain fields */
    }
  }
  const all = (k: string) => form.getAll(k).map((v) => (typeof v === "string" ? v : ""));
  const pn = all("line_pn");
  const desc = all("line_desc");
  const qty = all("line_qty");
  const model = all("line_model");
  const rows: Partial<RfqItem>[] = [];
  for (let i = 0; i < Math.max(pn.length, desc.length); i++) {
    const row = { partNumber: (pn[i] ?? "").trim(), description: (desc[i] ?? "").trim(), machineModel: (model[i] ?? "").trim() };
    if (!row.partNumber && !row.description) continue;
    const q = Number(String(qty[i] ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/\D/g, ""));
    rows.push({ ...row, quantity: q > 0 ? q : 1 });
  }
  return rows;
}

/** Contact fields from an RFQ multipart body (camelCase, as the schema wants). */
export function rfqContactFromForm(form: FormData): Record<string, string> {
  const s = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    phone: s("phone"),
    contactName: s("contact_name"),
    companyName: s("company_name"),
    email: s("email"),
    binNumber: s("bin_number"),
    deliveryArea: s("delivery_area") === "other" ? s("delivery_area_other") || "other" : s("delivery_area"),
    preferredContact: s("preferred_contact") || "whatsapp",
    notes: s("notes"),
    website: s("website"),
  };
}

/** Non-empty uploaded files (a no-JS form with an empty file input sends a 0-byte nameless part). */
export function filesFromForm(form: FormData): File[] {
  return form.getAll("attachments").filter((f): f is File => typeof f === "object" && f !== null && "size" in f && Boolean((f as File).name) && (f as File).size > 0);
}

/** Validated RFQ → Django multipart body. */
export function djangoRfqBody(
  contact: { phone: string; contactName: string; companyName: string; email: string; binNumber: string; deliveryArea: string; preferredContact: string; notes: string },
  items: RfqItem[],
  files: File[],
  locale: string,
): FormData {
  const fd = new FormData();
  fd.append("phone", contact.phone);
  fd.append("contact_name", contact.contactName);
  fd.append("company_name", contact.companyName);
  fd.append("email", contact.email);
  fd.append("bin_number", contact.binNumber);
  fd.append("delivery_area", contact.deliveryArea);
  fd.append("preferred_contact", contact.preferredContact);
  fd.append("notes", contact.notes);
  fd.append("locale", locale);
  fd.append("website", "");
  fd.append(
    "items",
    JSON.stringify(
      items.map((i) => ({
        product: i.productSlug,
        part_number: i.partNumber,
        description: i.description,
        quantity: i.quantity,
        machine_model: i.machineModel,
      })),
    ),
  );
  for (const f of files) fd.append("attachments", f, f.name);
  return fd;
}

export const RFQ_REFERENCE = /^RFQ-\d{4}-\d{3,8}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Locale-prefixed site path for redirects from route handlers ("en" has no prefix). */
export function sitePath(locale: string, path: string): string {
  return locale === "bn" ? `/bn${path}` : path;
}
