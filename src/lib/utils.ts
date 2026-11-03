import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency symbol lookup. We render with our own template (`{symbol} {number}`)
// instead of `Intl.NumberFormat({style:"currency"})` because the BDT locale
// renders Bengali numerals which most operators don't want; we prefer plain
// Latin digits with the taka glyph.
const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
};

export function currencySymbol(code: string = "BDT"): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? code.toUpperCase();
}

export function formatPrice(amount: number, currency: string = "BDT"): string {
  const symbol = currencySymbol(currency);
  const fractionDigits = amount % 1 === 0 ? 0 : 2;
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
