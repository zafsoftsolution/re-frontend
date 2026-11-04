import { toLatinDigits } from "@/lib/part-number";

/**
 * Quantity typed by a buyer → integer, or null when there are no digits.
 * Bangla digits (a Bangla keyboard types ০-৯) are converted BEFORE anything
 * non-numeric is stripped, so "১২" is 12, not empty.
 */
export function parseQty(raw: string): number | null {
  const digits = toLatinDigits(raw.normalize("NFKC")).replace(/\D/g, "").slice(0, 9);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** parseQty, clamped to [min, max]; empty / invalid → min. */
export function clampQty(raw: string | number, min: number, max: number): number {
  const n = typeof raw === "number" ? (Number.isFinite(raw) ? Math.floor(raw) : null) : parseQty(raw);
  if (n === null) return min;
  return Math.min(Math.max(n, min), max);
}

/** Keep only what a quantity field may hold while typing (Latin + Bangla digits). */
export function qtyDraft(raw: string, maxLength = 7): string {
  return raw.replace(/[^\d০-৯]/g, "").slice(0, maxLength);
}
