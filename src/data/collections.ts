import type { Collection } from "@/types";

export const collections: Collection[] = [
  {
    id: "col_ascension",
    name: "Ascension",
    slug: "ascension",
    season: "SS26",
    description:
      "A study in restraint, rhythm and rising lines. Our Spring/Summer 26 collection explores what happens when tailoring lightens — cut short, cut fluid, cut for motion.",
    heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2400&q=90",
    productIds: ["prd_0001", "prd_0004", "prd_0005", "prd_0009", "prd_0015", "prd_0010"],
    launchDate: "2026-04-01",
  },
  {
    id: "col_tenebrae",
    name: "Tenebrae",
    slug: "tenebrae",
    season: "FW25",
    description:
      "Weight, warmth, and well-earned silence. Our Fall/Winter 25 chapter reaches for depth — heavy wool overcoats, hand-fed cashmere knits, and denim built to remember.",
    heroImage: "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=2400&q=90",
    productIds: ["prd_0002", "prd_0003", "prd_0007", "prd_0011", "prd_0016", "prd_0021"],
    launchDate: "2025-09-15",
  },
  {
    id: "col_heirloom",
    name: "Heirloom",
    slug: "heirloom",
    season: "Continuous",
    description:
      "The pieces we return to, season after season. Cut in the same Italian mills, made the same way, priced the same — the pieces we consider done.",
    heroImage: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=2400&q=90",
    productIds: ["prd_0006", "prd_0008", "prd_0013", "prd_0018", "prd_0019", "prd_0020"],
    launchDate: "2024-01-01",
  },
  {
    id: "col_initiates",
    name: "Initiates",
    slug: "initiates",
    season: "Resort 26",
    description:
      "A pre-season capsule of 12 pieces. Dinner-ready, hotel-ready, flight-ready — cut in travel-forgiving fabrications that arrive without wrinkles.",
    heroImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=2400&q=90",
    productIds: ["prd_0012", "prd_0014", "prd_0022", "prd_0023", "prd_0024", "prd_0017"],
    launchDate: "2026-01-20",
  },
];

export const getCollectionBySlug = (slug: string) =>
  collections.find((c) => c.slug === slug);
