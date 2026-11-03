import type { LookbookEntry } from "@/types";

export const lookbooks: LookbookEntry[] = [
  {
    id: "lb_ss26",
    title: "Ascension",
    subtitle: "Chapter 01 · Spring / Summer 26",
    slug: "ascension-ss26",
    season: "SS26",
    coverImage:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2400&q=90",
    images: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2000&q=85",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=2000&q=85",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=2000&q=85",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=2000&q=85",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=2000&q=85",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=2000&q=85",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=2000&q=85",
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=2000&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=2000&q=85",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=2000&q=85",
    ],
    productIds: ["prd_0001", "prd_0004", "prd_0005", "prd_0009", "prd_0010", "prd_0015"],
    description:
      "A study in restraint, rhythm, and rising lines. Our Spring/Summer 26 collection.",
    intro:
      "Shot across three mornings in lower Manhattan, Ascension frames the Spring/Summer 26 collection against cool light and quiet architecture. The premise: every piece should feel as resolved standing still as it does in motion.",
    photographer: "Ines Albarrán",
    stylist: "Noa Beckett",
    location: "New York, NY",
    date: "2026-04-01",
  },
  {
    id: "lb_fw25",
    title: "Tenebrae",
    subtitle: "Chapter 00 · Fall / Winter 25",
    slug: "tenebrae-fw25",
    season: "FW25",
    coverImage:
      "https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=2400&q=90",
    images: [
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=2000&q=85",
      "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=2000&q=85",
      "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=2000&q=85",
      "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=2000&q=85",
      "https://images.unsplash.com/photo-1580331451062-99ff652288d7?w=2000&q=85",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=2000&q=85",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=2000&q=85",
      "https://images.unsplash.com/photo-1589992896044-69f36f74f58c?w=2000&q=85",
      "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=2000&q=85",
    ],
    productIds: ["prd_0001", "prd_0002", "prd_0003", "prd_0007", "prd_0011", "prd_0016", "prd_0021"],
    description: "Weight, warmth, and well-earned silence.",
    intro:
      "Tenebrae began as a question: how dark can we go before a piece loses its life? The answer is a quiet study in deep wool, warm cashmere, and raw selvedge — photographed in late-afternoon winter light in the Ligurian hills.",
    photographer: "Alessandro Bianchi",
    stylist: "Margaux Lanier",
    location: "Camogli, Italy",
    date: "2025-09-15",
  },
  {
    id: "lb_resort26",
    title: "Initiates",
    subtitle: "Chapter 02 · Resort 26",
    slug: "initiates-resort-26",
    season: "Resort 26",
    coverImage:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=2400&q=90",
    images: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=2000&q=85",
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=2000&q=85",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=2000&q=85",
      "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=2000&q=85",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=2000&q=85",
      "https://images.unsplash.com/photo-1625472603513-9d14bdd37c04?w=2000&q=85",
      "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=2000&q=85",
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=2000&q=85",
    ],
    productIds: ["prd_0012", "prd_0014", "prd_0022", "prd_0023", "prd_0024", "prd_0017"],
    description:
      "A pre-season capsule — travel-forgiving fabrications, dinner-ready silhouettes.",
    intro:
      "Initiates is a twelve-piece capsule cut for movement: for terminals, for hotel lobbies, for late-night flights. Technical wool that resists crease, washed silk, softened denim — photographed in the morning hush of a quiet Lisbon hotel.",
    photographer: "Joana Pereira",
    stylist: "Sena Ito",
    location: "Lisbon, Portugal",
    date: "2026-01-20",
  },
];

export const getLookbookBySlug = (slug: string) =>
  lookbooks.find((l) => l.slug === slug);
