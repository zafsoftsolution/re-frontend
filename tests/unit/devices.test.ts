import { describe, expect, it } from "vitest";
import { looksLikeDevice, splitPartsAndDevices } from "@/lib/catalog/devices";
import { activeNavKey, navData } from "@/components/site/nav";
import { partIconFor } from "@/components/icons/parts";
import type { CategorySummary, MachineBrandSummary } from "@/lib/api/types";

const cat = (slug: string, extra: Partial<CategorySummary> = {}): CategorySummary => ({
  id: slug,
  name: slug.replace(/-/g, " "),
  slug,
  image: "",
  description: "",
  productCount: 1,
  isFeatured: false,
  parentId: "",
  children: [],
  ...extra,
});

describe("devices mapping (slug patterns)", () => {
  it.each([
    "servo-motors",
    "motors-servo",
    "control-boxes-pcbs",
    "thread-trimmer-units",
    "auto-trimmer",
    "led-machine-lights",
    "attachments-folders",
    "gauge-sets-folders",
    "pullers",
    "lubrication-oilers",
    "oil-lubricants",
    "other-devices",
  ])("%s is a device", (slug) => expect(looksLikeDevice({ slug, name: "" })).toBe(true));

  it.each([
    "needles",
    "hooks-loopers",
    "bobbins-bobbin-cases",
    "feed-dogs",
    "presser-feet",
    "needle-plates",
    "knives-trimmer-blades",
    "tension-springs",
    "belts-pulleys",
    "motor-belts",
    "gears-shafts",
    "screws-small-parts",
    "carbon-brushes-for-motors",
  ])("%s is a part", (slug) => expect(looksLikeDevice({ slug, name: "" })).toBe(false));

  it("matches on the English name too", () => {
    expect(looksLikeDevice({ slug: "cat-17", name: "LED Machine Light" })).toBe(true);
  });
});

describe("splitPartsAndDevices", () => {
  it("falls back to patterns when no category is flagged", () => {
    const r = splitPartsAndDevices([cat("needles", { isDevice: false }), cat("servo-motors", { isDevice: false }), cat("feed-dogs")]);
    expect(r.source).toBe("pattern");
    expect(r.devices.map((c) => c.slug)).toEqual(["servo-motors"]);
    expect(r.parts.map((c) => c.slug)).toEqual(["needles", "feed-dogs"]);
  });

  it("trusts the admin flag once any category carries it", () => {
    const r = splitPartsAndDevices([
      cat("needles"),
      cat("servo-motors", { isDevice: false }), // admin says: part — respected
      cat("magnet-sets", { isDevice: true }),
    ]);
    expect(r.source).toBe("flag");
    expect(r.devices.map((c) => c.slug)).toEqual(["magnet-sets"]);
    expect(r.parts.map((c) => c.slug)).toEqual(["needles", "servo-motors"]);
  });

  it("returns no devices when none exist (menu hides the item)", () => {
    expect(splitPartsAndDevices([cat("needles"), cat("hooks")]).devices).toEqual([]);
  });
});

describe("nav data", () => {
  const brand = (slug: string, modelCount: number, isFeatured = false): MachineBrandSummary => ({
    id: slug,
    name: slug,
    slug,
    logo: "",
    country: "JP",
    isFeatured,
    modelCount,
    modelCountsByType: [],
  });

  it("splits categories, assigns icons (generic fallback) and orders brands", () => {
    const nav = navData(
      [cat("needles"), cat("servo-motors"), cat("mystery-widgets")],
      [brand("brother", 3), brand("juki", 9), brand("siruba", 1, true)],
    );
    expect(nav.parts.map((c) => [c.slug, c.icon])).toEqual([
      ["needles", "needle"],
      ["mystery-widgets", "screw"],
    ]);
    expect(nav.devices.map((c) => [c.slug, c.icon])).toEqual([["servo-motors", "servoMotor"]]);
    expect(nav.machineBrands.map((b) => b.slug)).toEqual(["siruba", "juki", "brother"]);
  });

  it("marks the current section", () => {
    const devices = new Set(["servo-motors"]);
    expect(activeNavKey("/categories", devices)).toBe("parts");
    expect(activeNavKey("/categories/needles", devices)).toBe("parts");
    expect(activeNavKey("/categories/servo-motors", devices)).toBe("devices");
    expect(activeNavKey("/parts/b1830", devices)).toBe("parts");
    expect(activeNavKey("/machines/juki/juki-ddl-8700", devices)).toBe("byMachine");
    expect(activeNavKey("/brands/organ", devices)).toBe("brands");
    expect(activeNavKey("/rfq", devices)).toBe("rfq");
    expect(activeNavKey("/", devices)).toBeNull();
  });
});

describe("part icons", () => {
  it.each([
    ["needle-plates", "needlePlate"],
    ["needles", "needle"],
    ["bobbins-bobbin-cases", "bobbinCase"],
    ["knives-trimmer-blades", "knife"],
    ["thread-trimmer-units", "knife"],
    ["belts-pulleys", "belt"],
    ["gears-shafts", "gear"],
    ["tension-springs", "spring"],
    ["screws-small-parts", "screw"],
    ["led-machine-lights", "ledLight"],
    ["attachments-folders", "folder"],
    ["pullers", "puller"],
    ["lubrication-oilers", "oiler"],
    ["control-boxes-pcbs", "controlBox"],
    ["servo-motors", "servoMotor"],
    ["feed-dogs", "feedDog"],
  ])("%s → %s", (slug, icon) => expect(partIconFor(slug)).toBe(icon));
});
