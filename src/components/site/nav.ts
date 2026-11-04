import { GENERIC_PART_ICON, partIconFor, type PartIconKey } from "@/components/icons/parts";
import type { CategorySummary, MachineBrandSummary } from "@/lib/api/types";
import { splitPartsAndDevices } from "@/lib/catalog/devices";

/**
 * Primary navigation (desktop row, mobile sheet, footer). Hrefs are
 * locale-less. Order is the client's: Parts · Devices · Parts by machine ·
 * Parts brands · Guides · Contact — then the "Request a quote" action.
 * Machine brands/models are ONLY a compatibility lookup: the business sells
 * spare parts and devices, never machines, so no label says just "Machines".
 */
export type NavKey = "parts" | "devices" | "byMachine" | "brands" | "guides" | "contact";
export type PanelKey = "parts" | "devices" | "machines";

export interface NavItem {
  key: NavKey;
  href: string;
  /** Mega-menu panel on desktop / accordion in the mobile sheet. */
  panel?: PanelKey;
}

/** Without JS (or for "All devices") the Devices item lands on its section of /categories. */
export const DEVICES_HREF = "/categories#devices";

export const PRIMARY_NAV: readonly NavItem[] = [
  { key: "parts", href: "/categories", panel: "parts" },
  { key: "devices", href: DEVICES_HREF, panel: "devices" },
  { key: "byMachine", href: "/machines", panel: "machines" },
  { key: "brands", href: "/brands" },
  { key: "guides", href: "/guides" },
  { key: "contact", href: "/contact" },
];

export interface NavCategory {
  slug: string;
  name: string;
  count: number;
  icon: PartIconKey;
}

export interface NavMachineBrand {
  slug: string;
  name: string;
  models: number;
  country: string;
}

export interface NavData {
  parts: NavCategory[];
  devices: NavCategory[];
  machineBrands: NavMachineBrand[];
}

const toNav = (c: CategorySummary): NavCategory => ({
  slug: c.slug,
  name: c.name,
  count: c.productCount,
  icon: partIconFor(`${c.slug} ${c.name}`) ?? GENERIC_PART_ICON,
});

/**
 * Menu data from bootstrap: parts vs devices (see lib/catalog/devices.ts for
 * the rule) and the machine brands for the "Parts by machine" panel —
 * featured first, then by model count, capped so the panel stays one screen.
 */
export function navData(categories: CategorySummary[], machineBrands: MachineBrandSummary[]): NavData {
  const { parts, devices } = splitPartsAndDevices(categories);
  const brands = [...machineBrands]
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.modelCount - a.modelCount || a.name.localeCompare(b.name))
    .slice(0, 16)
    .map((b) => ({ slug: b.slug, name: b.name, models: b.modelCount, country: b.country }));
  return { parts: parts.slice(0, 24).map(toNav), devices: devices.slice(0, 12).map(toNav), machineBrands: brands };
}

/** Which nav item a (locale-less) pathname belongs to. */
export function activeNavKey(pathname: string, deviceSlugs: ReadonlySet<string>): NavKey | "rfq" | null {
  const seg = pathname.split("/").filter(Boolean);
  switch (seg[0]) {
    case "categories":
      return seg[1] && deviceSlugs.has(decodeURIComponent(seg[1])) ? "devices" : "parts";
    case "parts":
      return "parts";
    case "machines":
      return "byMachine";
    case "brands":
      return "brands";
    case "guides":
      return "guides";
    case "contact":
      return "contact";
    case "rfq":
      return "rfq";
    default:
      return null;
  }
}
