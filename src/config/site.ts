export const siteConfig = {
  name: "Rakib Enterprise",
  tagline: "Parts That Keep the Line Running",
  shortDescription:
    "Genuine and quality aftermarket spare parts for industrial garment sewing machines — Juki, Brother, Yamato, Pegasus, Siruba and Kansai.",
  description:
    "Rakib Enterprise supplies genuine and aftermarket spare parts for industrial garment sewing machines — needles, loopers, feed dogs, presser feet, rotary hooks, servo motors and more — for Juki, Brother, Yamato, Pegasus, Siruba and Kansai machines. Correct part numbers, real stock, same-day dispatch.",
  url: "https://rakibenterprise-bd.com",
  email: "info@rakibenterprise-bd.com",
  phone: "+880 1700-000000",
  address: {
    line1: "Nawabpur Road",
    city: "Dhaka",
    state: "Dhaka",
    postcode: "1100",
    country: "Bangladesh",
  },
  currency: { code: "BDT", symbol: "৳" },
  social: {
    instagram: "https://instagram.com/rakibenterprise",
    tiktok: "https://tiktok.com/@rakibenterprise",
    pinterest: "https://pinterest.com/rakibenterprise",
    twitter: "https://twitter.com/rakibenterprise",
    youtube: "https://youtube.com/@rakibenterprise",
  },
  brand: {
    founded: 2019,
    atelier: "Dhaka, Bangladesh",
    palette: {
      navy: "#0E1A3A",
      gold: "#C9A14A",
      cream: "#F7F3EC",
      ink: "#0A0A0A",
    },
  },
  freeShippingThreshold: 150,
  currentSeason: "SS26",
  currentCollection: "Ascension",
} as const;

export type SiteConfig = typeof siteConfig;
