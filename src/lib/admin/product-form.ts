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

export const PRODUCT_INITIAL_VALUES: Record<string, unknown> = {
  status: "draft",
  gender: "unisex",
  fit: "regular",
  currency: "BDT",
  is_new: false,
  is_featured: false,
  is_best_seller: false,
  is_limited: false,
  images: [],
  tags: [],
  care_instructions: [],
  features: [],
  specifications: {},
  colors: [],
  sizes: [],
};

export function productFormFields({
  categories,
  brands,
  collections,
}: {
  categories: SelectOption[];
  brands: SelectOption[];
  collections: SelectOption[];
}): FormField[] {
  return [
    // ── Identity ───────────────────────────────────────────────────────
    { name: "name", label: "Name", type: "text", required: true },
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
      name: "gender",
      label: "Gender",
      type: "select",
      required: true,
      options: [
        { value: "men", label: "Men" },
        { value: "women", label: "Women" },
        { value: "unisex", label: "Unisex" },
        { value: "kids", label: "Kids" },
      ],
    },
    {
      name: "fit",
      label: "Fit",
      type: "select",
      options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Slim" },
        { value: "relaxed", label: "Relaxed" },
        { value: "oversized", label: "Oversized" },
        { value: "tailored", label: "Tailored" },
      ],
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: categories,
    },
    { name: "brand", label: "Brand", type: "select", options: brands },
    { name: "collection", label: "Collection", type: "select", options: collections },

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
      name: "material",
      label: "Material",
      type: "text",
      full: true,
      placeholder: "100% organic cotton",
    },
    {
      name: "care_instructions",
      label: "Care instructions",
      type: "stringList",
      full: true,
      placeholder: "e.g. Cold wash",
    },
    {
      name: "features",
      label: "Features",
      type: "stringList",
      full: true,
      placeholder: "e.g. Horn buttons",
    },
    {
      name: "specifications",
      label: "Specifications",
      type: "keyValue",
      full: true,
      hint: "e.g. origin → Made in Italy",
    },
    {
      name: "tags",
      label: "Tags",
      type: "chips",
      full: true,
      placeholder: "Add tag and press Enter",
    },

    // ── Variants ───────────────────────────────────────────────────────
    {
      name: "colors",
      label: "Color variants",
      type: "colorVariants",
      full: true,
      hint: "Click the swatch to pick a color.",
    },
    {
      name: "sizes",
      label: "Size variants",
      type: "sizeVariants",
      full: true,
      hint: "Use a preset for standard sizes, or add labels manually.",
    },

    // ── Flags ──────────────────────────────────────────────────────────
    { name: "is_new", label: "New arrival", type: "boolean" },
    { name: "is_featured", label: "Featured", type: "boolean" },
    { name: "is_best_seller", label: "Best seller", type: "boolean" },
    { name: "is_limited", label: "Limited edition", type: "boolean" },

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
