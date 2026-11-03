/**
 * Shared ResourceForm field blocks for the catalogue tables (machine brands,
 * machine models, categories, parts brands): Bangla copies + SEO overrides.
 * All of these are accepted by the staff write serializers.
 */
import type { FormField } from "@/components/admin/ResourceForm";

export const nameBnField: FormField = {
  name: "name_bn",
  label: "Name (বাংলা)",
  type: "text",
  hint: "Shown on the Bangla site. Leave blank to use the English name.",
};

export function descriptionFields(rows = 3): FormField[] {
  return [
    { name: "description", label: "Description", type: "textarea", full: true, rows },
    {
      name: "description_bn",
      label: "Description (বাংলা)",
      type: "textarea",
      full: true,
      rows,
      hint: "Shown on the Bangla site. Leave blank to fall back to English.",
    },
  ];
}

export function seoFields({ og = true }: { og?: boolean } = {}): FormField[] {
  const out: FormField[] = [
    {
      name: "seo_title",
      label: "SEO title",
      type: "text",
      full: true,
      hint: "Max 200 characters. Blank = generated from the name.",
    },
    {
      name: "seo_description",
      label: "Meta description",
      type: "textarea",
      full: true,
      rows: 2,
      hint: "Max 300 characters, ideally 140–160. Blank = generated.",
    },
  ];
  if (og) {
    out.push({
      name: "og_image",
      label: "Social share image (OG)",
      type: "imageUrl",
      full: true,
      hint: "1200×630. Blank = logo / site default.",
    });
  }
  return out;
}

/** Machine types — mirrors storefront.models.MachineType. */
export const MACHINE_TYPES: Array<{ value: string; label: string }> = [
  { value: "lockstitch", label: "Lockstitch (single/double needle)" },
  { value: "overlock", label: "Overlock / Serger" },
  { value: "flatlock", label: "Flatlock / Coverstitch" },
  { value: "buttonhole", label: "Buttonhole" },
  { value: "bartack", label: "Bartack" },
  { value: "button_attach", label: "Button attaching" },
  { value: "feed_off_arm", label: "Feed-off-the-arm" },
  { value: "multi_needle", label: "Multi-needle / Chainstitch" },
  { value: "blind_stitch", label: "Blind stitch" },
  { value: "special", label: "Special / Automatic" },
  { value: "other", label: "Other" },
];
