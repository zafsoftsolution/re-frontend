/**
 * Bangladesh phone validation for the public forms (RFQ, checkout, contact).
 *
 * Buyers type numbers every way: "01711-123456", "+880 1711 123456",
 * "8801711123456", "০১৭১১১২৩৪৫৬" (Bangla keyboard), "02-9123456" (Dhaka
 * landline). `normalizeBdPhone` reduces them to the national format
 * ("01711123456" / "029123456") or returns null when it is not a BD number.
 */
import { toLatinDigits } from "@/lib/part-number";

/** Mobile: 01 + operator digit 3–9 + 8 digits (11 digits). */
const MOBILE = /^01[3-9]\d{8}$/;
/** Landline: 0 + area code (2–9…) — 9 to 11 digits in national format. */
const LANDLINE = /^0[2-9]\d{7,9}$/;

export function normalizeBdPhone(input: string): string | null {
  const raw = toLatinDigits((input ?? "").normalize("NFKC")).trim();
  if (!raw || /[^\d\s()+\-.]/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && !digits.startsWith("880")) return null; // foreign country code
  if (digits.startsWith("00880")) digits = digits.slice(2);
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (!digits.startsWith("0")) digits = `0${digits}`;
  if (MOBILE.test(digits) || LANDLINE.test(digits)) return digits;
  return null;
}

export const isBdPhone = (input: string) => normalizeBdPhone(input) !== null;

/** "01711123456" → "01711-123456" (display only). */
export function formatBdPhone(national: string): string {
  return MOBILE.test(national) ? `${national.slice(0, 5)}-${national.slice(5)}` : national;
}
