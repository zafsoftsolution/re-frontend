/**
 * Shared helpers for the admin quotes (RFQ) screens: status labels/tones,
 * money maths on the API's decimal strings, and contact links.
 */
import type { QuotePreferredContact, QuoteStatus } from "@/lib/django-admin";

export const QUOTE_STATUSES: QuoteStatus[] = [
  "new",
  "in_review",
  "quoted",
  "accepted",
  "converted",
  "rejected",
  "expired",
  "cancelled",
];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  new: "New",
  in_review: "In review",
  quoted: "Quoted",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
  converted: "Converted",
};

/** Pill classes — colour is always paired with the text label. All AA on white. */
export const QUOTE_STATUS_TONE: Record<QuoteStatus, string> = {
  new: "bg-re-red-cta text-white ring-re-red-cta",
  in_review: "bg-[#FFF4DC] text-[#8A5200] ring-[#E9C77A]",
  quoted: "bg-[#E5F1FA] text-re-blue-text ring-[#9CC7E6]",
  accepted: "bg-[#E6F3EA] text-re-stock-in ring-[#9FCDAE]",
  converted: "bg-re-ink text-white ring-re-ink",
  rejected: "bg-re-steel-100 text-re-steel-600 ring-re-steel-300",
  expired: "bg-re-steel-100 text-re-steel-600 ring-re-steel-300",
  cancelled: "bg-re-steel-100 text-re-steel-600 ring-re-steel-300",
};

export const PREFERRED_CONTACT_LABEL: Record<QuotePreferredContact, string> = {
  whatsapp: "WhatsApp",
  call: "Phone call",
  email: "Email",
};

/** Parse an API decimal string (or number) — null for empty/invalid. */
export function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "BDT 12,345.50" — always 2 decimals, Latin digits (rendered in mono). */
export function formatMoney(v: string | number | null | undefined, currency = "BDT"): string {
  const n = toNumber(v);
  if (n === null) return "—";
  return `${currency === "BDT" ? "৳" : currency} ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Round to 2dp and return the API string form. */
export function toMoneyString(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Normalise a Bangladeshi phone to international digits (8801XXXXXXXXX) for
 * wa.me links. Accepts 01XXXXXXXXX, +8801…, 8801…, with spaces/dashes.
 * Non-BD numbers pass through as digits.
 */
export function waDigits(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (/^01\d{9}$/.test(d)) return "88" + d;
  if (/^1\d{9}$/.test(d)) return "880" + d;
  return d;
}

export function whatsappLink(phone: string, text?: string): string | null {
  const d = waDigits(phone);
  if (d.length < 8) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone: string): string {
  const cleaned = (phone || "").replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

/** BD mobile format check used by settings (WhatsApp / contact phone). */
export function isValidBdPhone(v: string): boolean {
  const d = (v || "").replace(/[\s-]/g, "");
  return /^(\+?880|0)1[3-9]\d{8}$/.test(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Date-only strings ("2026-11-10") are parsed as UTC midnight — render in UTC
  // so the day never shifts.
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) opts.timeZone = "UTC";
  return new Date(iso).toLocaleDateString("en-GB", opts);
}

/** "3h ago" style relative time for list rows. */
export function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function isoDateInDays(days: number, from = new Date()): string {
  const d = new Date(from.getTime() + days * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
