/** Primary navigation (desktop row + mobile menu). Hrefs are locale-less. */
export const PRIMARY_NAV = [
  { key: "machines", href: "/machines" },
  { key: "categories", href: "/categories" },
  { key: "brands", href: "/brands" },
  { key: "rfq", href: "/rfq" },
  { key: "guides", href: "/guides" },
  { key: "contact", href: "/contact" },
] as const;

export type NavKey = (typeof PRIMARY_NAV)[number]["key"];
