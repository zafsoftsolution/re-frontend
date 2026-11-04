/**
 * Guest checkout helpers (server side): resolve cart slugs to live product
 * data and build the Django /inventory/guest-checkout/ body.
 */
import { ApiError, apiFetch } from "@/lib/api/client";
import { mapPart } from "@/lib/api/mappers";
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

/** Live price + mode per cart slug (uncached read; missing parts → found:false). */
export async function resolveLines(slugs: string[], locale: string): Promise<ResolvedLine[]> {
  const unique = [...new Set(slugs)].slice(0, 100);
  return Promise.all(
    unique.map(async (slug): Promise<ResolvedLine> => {
      try {
        const p = mapPart(await apiFetch<unknown>(`/site/products/${encodeURIComponent(slug)}/`, { locale, timeoutMs: 8000 }));
        if (!p) throw new ApiError("not found", 404);
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
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return { productSlug: slug, id: "", name: "", partNumber: "", price: null, direct: false, availableQty: 0, found: false };
        }
        throw err;
      }
    }),
  );
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
