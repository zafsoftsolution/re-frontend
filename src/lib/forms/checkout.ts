/**
 * Guest checkout helpers (server side): resolve cart slugs to live product
 * data and build the Django /inventory/guest-checkout/ body.
 */
import { ApiError, unwrapList } from "@/lib/api/client";
import { mapList, mapPart } from "@/lib/api/mappers";
import type { PartSummary } from "@/lib/api/types";
import { callDjango, forwardHeaders } from "./forward";
import type { CheckoutValues } from "./schemas";

export interface ResolvedLine {
  productSlug: string;
  id: string;
  name: string;
  partNumber: string;
  /** null for quote-only parts (backend hides the price). */
  price: number | null;
  direct: boolean;
  availableQty: number;
  found: boolean;
}

/** Most distinct cart lines resolved per request (one backend page). */
export const MAX_CART_LINES = 100;

/**
 * Live price + mode per cart slug in ONE backend call
 * (`/site/products/?slugs=a,b,c&page_size=100`), uncached. Sent like a
 * browser request — without X-Internal-Secret, with the visitor's IP — so
 * the backend's anonymous throttles apply to the visitor. Slugs must already
 * be validated (isValidSlug). Missing / inactive parts → found:false.
 * Throws on network errors and non-2xx responses.
 */
export async function resolveLines(
  slugs: string[],
  locale: string,
  visitor: { ip?: string; userAgent?: string | null } = {},
): Promise<ResolvedLine[]> {
  const unique = [...new Set(slugs)].slice(0, MAX_CART_LINES);
  if (!unique.length) return [];
  const res = await callDjango<unknown>("/site/products/", {
    method: "GET",
    headers: forwardHeaders({ locale, ip: visitor.ip, userAgent: visitor.userAgent }),
    query: { slugs: unique.join(","), page_size: String(MAX_CART_LINES) },
    timeoutMs: 10_000,
  });
  if (!res.ok) throw new ApiError(`products lookup failed (${res.status})`, res.status);
  const bySlug = new Map<string, PartSummary>();
  for (const p of mapList(unwrapList(res.data as never), mapPart)) bySlug.set(p.slug, p);
  return unique.map((slug): ResolvedLine => {
    const p = bySlug.get(slug);
    if (!p) return { productSlug: slug, id: "", name: "", partNumber: "", price: null, direct: false, availableQty: 0, found: false };
    return {
      productSlug: slug,
      id: p.id,
      name: p.name,
      partNumber: p.partNumber,
      price: p.price,
      direct: p.salesMode === "direct" && p.price !== null,
      availableQty: p.availableQty,
      found: true,
    };
  });
}

const DIVISION_NAMES: Record<CheckoutValues["division"], string> = {
  dhaka: "Dhaka",
  chattogram: "Chattogram",
  rajshahi: "Rajshahi",
  khulna: "Khulna",
  barishal: "Barishal",
  sylhet: "Sylhet",
  rangpur: "Rangpur",
  mymensingh: "Mymensingh",
};

/** One-field name → the backend's required first_name / last_name. */
export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

/** Validated checkout form + resolved lines → DirectCheckoutSerializer body. */
export function guestCheckoutBody(values: CheckoutValues, lines: { id: string; qty: number }[]) {
  const { first, last } = splitName(values.name);
  const address = {
    first_name: first,
    last_name: last,
    phone: values.phone,
    line1: values.street,
    line2: values.area,
    city: values.district,
    state: DIVISION_NAMES[values.division],
    // Required by the backend; many BD buyers don't know theirs.
    postcode: values.postcode || "0000",
    country: "BD",
  };
  return {
    customer_phone: values.phone,
    customer_email: values.email,
    shipping_address: address,
    payment_method: values.paymentMethod,
    coupon_code: values.coupon,
    notes: values.notes,
    currency: "BDT",
    items: lines.map((l) => ({ product: l.id, quantity: l.qty })),
  };
}
