import type { Brand } from "@/types";

export const brands: Brand[] = [
  {
    id: "brand_jmn",
    name: "Rakib Atelier",
    slug: "jmn-atelier",
    logo: "/logo/rakib-mark.svg",
    description: "The house line. Cut and stitched in our New York atelier.",
    productCount: 32,
  },
  {
    id: "brand_heirloom",
    name: "Heirloom",
    slug: "heirloom",
    logo: "/logo/rakib-mark.svg",
    description: "Archive-inspired pieces, reissued in seasonal runs.",
    productCount: 18,
  },
  {
    id: "brand_ascent",
    name: "Ascent Studio",
    slug: "ascent-studio",
    logo: "/logo/rakib-mark.svg",
    description: "Technical tailoring for the modern commute.",
    productCount: 22,
  },
  {
    id: "brand_north",
    name: "North & Noble",
    slug: "north-noble",
    logo: "/logo/rakib-mark.svg",
    description: "Heritage outerwear, built to age beautifully.",
    productCount: 14,
  },
  {
    id: "brand_maison",
    name: "Maison Lumière",
    slug: "maison-lumiere",
    logo: "/logo/rakib-mark.svg",
    description: "Parisian-edged eveningwear and fluid silhouettes.",
    productCount: 11,
  },
  {
    id: "brand_field",
    name: "Field Company",
    slug: "field-company",
    logo: "/logo/rakib-mark.svg",
    description: "Denim and workwear, built with intent.",
    productCount: 9,
  },
];

export const getBrandBySlug = (slug: string) => brands.find((b) => b.slug === slug);
