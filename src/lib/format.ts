/**
 * Money and phone formatting for the public site. Prices always use Latin
 * digits (also in the bn UI — buyers compare them against invoices) with
 * South-Asian grouping: ৳ 1,25,000.
 */
const bdt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatBDT(amount: number): string {
  return `৳ ${bdt.format(Math.round(amount * 100) / 100)}`;
}

/** Digits only, with Bangladesh country code, for tel: / wa.me links. */
export function toE164BD(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

export function telHref(phone: string): string {
  const e = toE164BD(phone);
  return e ? `tel:+${e}` : "";
}

export function whatsappHref(phone: string, text?: string): string {
  const e = toE164BD(phone);
  if (!e) return "";
  return `https://wa.me/${e}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
