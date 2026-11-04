/**
 * zod 4 schemas for the public conversion forms. Shared by the client
 * (react-hook-form resolver) and the route handlers (server re-validation),
 * so a request that skips the browser (no JS, curl) gets the same rules.
 *
 * Error messages are *codes* ("phone_invalid", …) — the UI translates them
 * from the `rfq.errors` / `checkout.errors` / `contact.errors` messages, so
 * bn and en share one schema.
 */
import { z } from "zod";
import { normalizeBdPhone } from "./phone";
import { isValidSlug } from "@/lib/api/catalog-index";

export const RFQ_MAX_FILES = 5;
export const RFQ_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const RFQ_FILE_EXTENSIONS = ["xlsx", "xls", "csv", "pdf", "jpg", "jpeg", "png", "webp"] as const;
/** For <input accept>: extensions plus the MIME types phones report. */
export const RFQ_ACCEPT = [
  ...RFQ_FILE_EXTENSIONS.map((e) => `.${e}`),
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
].join(",");
export const RFQ_MAX_ITEMS = 200;
/** Backend DirectCheckoutItemSerializer caps a line at 99. */
export const CHECKOUT_MAX_QTY = 99;

const trimmed = (max: number) => z.string().trim().max(max, "too_long");
const optionalEmail = z
  .string()
  .trim()
  .max(254, "too_long")
  .refine((v) => v === "" || z.email().safeParse(v).success, "email_invalid");

/** Required BD phone, normalised to national format ("01711123456"). */
export const bdPhone = z
  .string()
  .trim()
  .min(1, "phone_required")
  .refine((v) => normalizeBdPhone(v) !== null, "phone_invalid")
  .transform((v) => normalizeBdPhone(v) as string);

export const PREFERRED_CONTACT = ["whatsapp", "call", "email"] as const;

// ─── RFQ ─────────────────────────────────────────────────────────────────────

export const rfqItemSchema = z
  .object({
    productSlug: trimmed(200).default(""),
    partNumber: trimmed(120).default(""),
    description: trimmed(500).default(""),
    quantity: z.coerce.number().int("qty_invalid").min(1, "qty_invalid").max(1_000_000, "qty_invalid").default(1),
    machineModel: trimmed(200).default(""),
  })
  .refine((i) => Boolean(i.productSlug || i.partNumber || i.description), "item_empty");

export type RfqItem = z.infer<typeof rfqItemSchema>;

/** Contact block of the RFQ form (what react-hook-form manages). */
export const rfqContactSchema = z
  .object({
    phone: bdPhone,
    contactName: trimmed(120).default(""),
    companyName: trimmed(200).default(""),
    email: optionalEmail.default(""),
    binNumber: z
      .string()
      .trim()
      .max(40, "too_long")
      .refine((v) => v === "" || (/^[0-9০-৯\s-]+$/.test(v) && /^\d{9,13}$/.test(v.replace(/[\s-]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))))), "bin_invalid")
      .default(""),
    deliveryArea: trimmed(200).default(""),
    preferredContact: z.enum(PREFERRED_CONTACT).default("whatsapp"),
    notes: trimmed(5000).default(""),
    /** Honeypot — real users never see it. */
    website: z.string().max(200).default(""),
  })
  .refine((v) => v.preferredContact !== "email" || v.email !== "", { path: ["email"], message: "email_required_for_contact" });

export type RfqContact = z.output<typeof rfqContactSchema>;
export type RfqContactInput = z.input<typeof rfqContactSchema>;

export const rfqSubmissionSchema = z.object({
  contact: rfqContactSchema,
  items: z.array(rfqItemSchema).max(RFQ_MAX_ITEMS, "too_many_items"),
});

export type FileCheck = { name: string; size: number; type?: string };
export type FileError = { name: string; code: "file_type" | "file_size" | "file_empty" } | { name: ""; code: "file_count" };

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

/** Client + server pre-check of attachments (the backend re-checks contents). */
export function checkFiles(files: FileCheck[]): FileError[] {
  const errors: FileError[] = [];
  if (files.length > RFQ_MAX_FILES) errors.push({ name: "", code: "file_count" });
  for (const f of files) {
    if (!(RFQ_FILE_EXTENSIONS as readonly string[]).includes(extOf(f.name))) errors.push({ name: f.name, code: "file_type" });
    else if (f.size > RFQ_MAX_FILE_BYTES) errors.push({ name: f.name, code: "file_size" });
    else if (f.size === 0) errors.push({ name: f.name, code: "file_empty" });
  }
  return errors;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export const BD_DIVISIONS = ["dhaka", "chattogram", "rajshahi", "khulna", "barishal", "sylhet", "rangpur", "mymensingh"] as const;

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "name_required").max(120, "too_long"),
  phone: bdPhone,
  email: optionalEmail.default(""),
  division: z.enum(BD_DIVISIONS, "division_required"),
  district: z.string().trim().min(2, "district_required").max(80, "too_long"),
  area: z.string().trim().min(2, "area_required").max(120, "too_long"),
  street: z.string().trim().min(4, "street_required").max(300, "too_long"),
  postcode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))), "postcode_invalid")
    .default(""),
  notes: trimmed(1000).default(""),
  coupon: trimmed(30).default(""),
  paymentMethod: z.enum(["cod", "bank_transfer"]).default("cod"),
});

export type CheckoutValues = z.output<typeof checkoutSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const checkoutItemsSchema = z
  .array(
    z.object({
      productSlug: z.string().trim().min(1).max(200).refine(isValidSlug, "slug_invalid"),
      qty: z.coerce.number().int().min(1).max(CHECKOUT_MAX_QTY, "qty_max"),
    }),
  )
  .min(1, "cart_empty")
  .max(100, "too_many_items");

export const checkoutRequestSchema = z.object({
  values: checkoutSchema,
  items: checkoutItemsSchema,
  locale: z.enum(["en", "bn"]).default("en"),
});

// ─── Contact ─────────────────────────────────────────────────────────────────

export const CONTACT_TOPICS = ["parts", "quote", "order", "other"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "name_required").max(120, "too_long"),
  phone: bdPhone,
  email: z.string().trim().min(1, "email_required").max(254, "too_long").pipe(z.email("email_invalid")),
  topic: z.enum(CONTACT_TOPICS).default("parts"),
  message: z.string().trim().min(10, "message_short").max(4000, "too_long"),
  website: z.string().max(200).default(""),
});

export type ContactValues = z.output<typeof contactSchema>;
export type ContactInput = z.input<typeof contactSchema>;

/** First error code per top-level path ("phone" → "phone_invalid"). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
