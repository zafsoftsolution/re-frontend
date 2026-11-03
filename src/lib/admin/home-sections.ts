/**
 * Home page sections of the Rakib Enterprise site, mapped onto the backend's
 * existing HomeBlock kinds (API-compatible — no new kinds needed):
 *
 *   section            HomeBlock kind   + metadata.section
 *   ─────────────────  ───────────────  ─────────────────
 *   hero               hero
 *   announcement       marquee
 *   machine_brands     custom           "machine_brands"   (brands = MachineBrand.is_featured)
 *   categories         category_grid                       (featured_categories M2M)
 *   parts              featured_edit                       (featured_products M2M)
 *   rfq_band           custom           "rfq_band"
 *
 * Fashion-era kinds (manifesto, new_arrivals, lookbook_feature, best_sellers,
 * testimonials, newsletter_cta, plain custom) are "legacy": listed read-only
 * so they can be hidden or deleted, never created. GET /api/site/home/
 * returns blocks grouped by kind — the public site reads `custom[]` and
 * filters on `metadata.section`.
 */
import type { HomeBlockKind, HomeBlockShape } from "@/lib/django-admin";

export type HomeSectionKey =
  | "hero"
  | "announcement"
  | "machine_brands"
  | "categories"
  | "parts"
  | "rfq_band";

export type HomeField = "eyebrow" | "title" | "subtitle" | "body" | "image" | "cta";

export interface HomeSectionDef {
  key: HomeSectionKey;
  kind: HomeBlockKind;
  /** metadata.section marker for `custom` kinds. */
  marker?: string;
  label: string;
  help: string;
  fields: HomeField[];
  picker?: "categories" | "products";
  /** Several blocks allowed (e.g. hero slides). */
  multiple?: boolean;
  defaults: Partial<HomeBlockShape>;
}

export const HOME_SECTIONS: HomeSectionDef[] = [
  {
    key: "announcement",
    kind: "marquee",
    label: "Announcement bar",
    help: "Thin strip above the header — delivery cut-off, holiday hours, new stock. Keep it to one line.",
    fields: ["body", "cta"],
    defaults: { body: "Same-day dispatch in Dhaka for orders confirmed before 3 pm." },
  },
  {
    key: "hero",
    kind: "hero",
    label: "Hero",
    help: "Top of the home page: headline + part-number search. The search box is always there; this sets the copy and an optional photo.",
    fields: ["eyebrow", "title", "subtitle", "image", "cta"],
    multiple: true,
    defaults: {
      eyebrow: "Industrial sewing machine parts",
      title: "Find the part. Get it today.",
      subtitle: "Search by part number, or browse by machine brand and model.",
      cta_label: "Request a quote",
      cta_href: "/rfq",
    },
  },
  {
    key: "machine_brands",
    kind: "custom",
    marker: "machine_brands",
    label: "Featured machine brands",
    help: "Heading above the machine-brand tiles. Which brands appear is set by “Featured” on Catalogue → Machine brands.",
    fields: ["eyebrow", "title", "subtitle", "cta"],
    defaults: { title: "Shop by machine brand", cta_label: "All brands", cta_href: "/machines" },
  },
  {
    key: "categories",
    kind: "category_grid",
    label: "Featured categories",
    help: "Part-type grid (hooks, needles, feed dogs…). Pick the categories to show, in order; none picked = categories marked Featured.",
    fields: ["eyebrow", "title", "subtitle", "cta"],
    picker: "categories",
    defaults: { title: "Browse by part type", cta_label: "All categories", cta_href: "/categories" },
  },
  {
    key: "parts",
    kind: "featured_edit",
    label: "Featured parts",
    help: "A short table of parts to highlight (fast movers, new stock). Pick up to 8; none picked = parts marked Featured.",
    fields: ["eyebrow", "title", "subtitle", "cta"],
    picker: "products",
    defaults: { title: "Fast-moving parts", cta_label: "Search all parts", cta_href: "/search" },
  },
  {
    key: "rfq_band",
    kind: "custom",
    marker: "rfq_band",
    label: "RFQ band",
    help: "The call-to-action band for procurement: send a parts list, get a formal quote. Shown near the bottom of the page.",
    fields: ["eyebrow", "title", "subtitle", "body", "cta"],
    defaults: {
      eyebrow: "Procurement",
      title: "Send your parts list — get a formal quote",
      subtitle: "Excel, photo or part numbers. VAT invoice with BIN, bank transfer accepted.",
      cta_label: "Request a quote",
      cta_href: "/rfq",
    },
  },
];

export function sectionOf(block: Pick<HomeBlockShape, "kind" | "metadata">): HomeSectionDef | null {
  const marker = (block.metadata as { section?: unknown } | null)?.section;
  return (
    HOME_SECTIONS.find((s) =>
      s.marker ? block.kind === s.kind && marker === s.marker : block.kind === s.kind,
    ) ?? null
  );
}

export const LEGACY_KIND_LABEL: Partial<Record<HomeBlockKind, string>> = {
  manifesto: "Manifesto (fashion)",
  new_arrivals: "New arrivals header",
  lookbook_feature: "Lookbook feature (fashion)",
  best_sellers: "Best sellers header",
  testimonials: "Testimonials header",
  newsletter_cta: "Newsletter closing",
  custom: "Custom block",
};
