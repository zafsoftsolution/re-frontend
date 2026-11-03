/**
 * Shared product-form config — used by `/admin/products` (ResourceManager)
 * AND the PO page's "Create new product" drawer. Single source of truth so
 * the two surfaces stay in lock-step when fields are added or renamed.
 *
 * Usage:
 *   const fields = productFormFields({ categories, brands, collections });
 *   <ResourceForm fields={fields} initialValues={PRODUCT_INITIAL_VALUES} ... />
 */

import type { FormField } from "@/components/admin/ResourceForm";

export interface SelectOption {
  value: string;
  label: string;
}

// Fashion-era fields (gender, fit, material, care instructions, colour/size
// variants, collection) are intentionally absent: never shown, never sent,
// so legacy values stay untouched.
export const PRODUCT_INITIAL_VALUES: Record<string, unknown> = {
  status: "draft",
  currency: "BDT",
  sales_mode: "inherit",
  price_on_request: false,
  min_order_quantity: 1,
  availability_override: "auto",
  alt_part_numbers: [],
  is_new: false,
  is_featured: false,
  is_best_seller: false,
  is_limited: false,
  images: [],
  tags: [],
  features: [],
  specifications: {},
};

export function productFormFields({
  categories,
  brands,
}: {
  categories: SelectOption[];
  brands: SelectOption[];
  /** Ignored — collections are a fashion-era field, kept for call-site compatibility. */
  collections?: SelectOption[];
}): FormField[] {
  return [
    // ── Identity ───────────────────────────────────────────────────────
    { name: "name", label: "Part name", type: "text", required: true },
    { name: "part_number", label: "Part number (OEM)", type: "text", placeholder: "B1101-012-000" },
    {
      name: "alt_part_numbers",
      label: "Alternate part numbers",
      type: "chips",
      full: true,
      placeholder: "Add a number and press Enter",
    },
    {
      name: "sku",
      label: "SKU",
      type: "text",
      required: true,
      hint: "Auto-generated from name — change if you have your own scheme.",
      autoFrom: "name",
      autoDerive: "sku",
    },
    {
      name: "slug",
      label: "Slug",
      type: "slug",
      required: true,
      hint: "URL fragment — auto-generated from the name.",
      autoFrom: "name",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ],
    },

    // ── Taxonomy ───────────────────────────────────────────────────────
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: categories,
    },
    { name: "brand", label: "Parts brand", type: "select", options: brands },

    // ── Pricing ────────────────────────────────────────────────────────
    { name: "price", label: "Price", type: "number", required: true },
    {
      name: "compare_at_price",
      label: "Compare-at price",
      type: "number",
      hint: "Strike-through price",
    },
    {
      name: "cost_price",
      label: "Cost price",
      type: "number",
      hint: "Internal cost — never shown publicly",
    },
    { name: "currency", label: "Currency", type: "text", placeholder: "BDT" },

    // ── How it's sold (QUOTE-FIRST) ────────────────────────────────────
    {
      name: "sales_mode",
      label: "Sales mode",
      type: "select",
      options: [
        { value: "inherit", label: "Inherit from site" },
        { value: "quote_only", label: "Quote only" },
        { value: "direct", label: "Direct (only when site is Mixed)" },
      ],
    },
    { name: "price_on_request", label: "Price on request", type: "boolean" },
    { name: "min_order_quantity", label: "Min. order qty", type: "number" },
    { name: "lead_time_days", label: "Lead time (days)", type: "number" },
    {
      name: "availability_override",
      label: "Availability",
      type: "select",
      options: [
        { value: "auto", label: "Automatic (from stock)" },
        { value: "on_request", label: "Available on request" },
        { value: "discontinued", label: "Discontinued" },
      ],
    },

    // ── Imagery ────────────────────────────────────────────────────────
    {
      name: "images",
      label: "Images",
      type: "imageList",
      full: true,
      hint: "First image becomes the cover. Use the arrows to reorder.",
    },

    // ── Descriptive ────────────────────────────────────────────────────
    { name: "short_description", label: "Short description", type: "text", full: true },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      full: true,
      rows: 5,
      required: true,
    },
    {
      name: "features",
      label: "Features",
      type: "stringList",
      full: true,
      placeholder: "e.g. Hardened steel",
    },
    {
      name: "specifications",
      label: "Specifications",
      type: "keyValue",
      full: true,
      hint: "e.g. Position → Upper looper",
    },
    {
      name: "tags",
      label: "Tags",
      type: "chips",
      full: true,
      placeholder: "Add tag and press Enter",
    },


    // ── Flags ──────────────────────────────────────────────────────────
    { name: "is_new", label: "New arrival", type: "boolean" },
    { name: "is_featured", label: "Featured", type: "boolean" },
    { name: "is_best_seller", label: "Best seller", type: "boolean" },
    

    // ── SEO ────────────────────────────────────────────────────────────
    { name: "seo_title", label: "SEO title", type: "text", full: true },
    {
      name: "seo_description",
      label: "SEO description",
      type: "textarea",
      full: true,
      rows: 2,
    },
  ];
}
