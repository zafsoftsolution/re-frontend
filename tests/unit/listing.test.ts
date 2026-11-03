import { describe, expect, it } from "vitest";
import {
  applyListing,
  DEFAULT_SORT,
  hasActiveFilters,
  listingQuery,
  pageWindow,
  parseListingParams,
} from "@/lib/catalog/listing";
import type { PartSummary } from "@/lib/api/types";

function part(o: Partial<PartSummary> & { slug: string }): PartSummary {
  return {
    id: o.slug,
    name: o.slug,
    sku: "",
    partNumber: "",
    categorySlug: "needles",
    categoryName: "Needles",
    brandSlug: "organ",
    brandName: "Organ",
    brandIsOem: false,
    altPartNumbers: [],
    minOrderQuantity: 1,
    priceOnRequest: true,
    leadTimeDays: null,
    fitsCount: 0,
    match: "",
    price: null,
    compareAtPrice: null,
    salesMode: "quote",
    currency: "BDT",
    image: "",
    availability: "in_stock",
    availableQty: 1,
    machineModelSlugs: [],
    machineBrandSlugs: [],
    createdAt: "2026-01-01T00:00:00Z",
    ...o,
  };
}

describe("parseListingParams", () => {
  it("defaults", () => {
    expect(parseListingParams({})).toEqual({
      machine: "",
      mbrand: "",
      brand: "",
      category: "",
      inStock: false,
      sort: DEFAULT_SORT,
      page: 1,
    });
  });
  it("reads valid values and takes the first of repeated keys", () => {
    const p = parseListingParams({ machine: ["juki-ddl-8700", "x"], brand: "organ", stock: "1", sort: "newest", page: "3" });
    expect(p).toMatchObject({ machine: "juki-ddl-8700", brand: "organ", inStock: true, sort: "newest", page: 3 });
  });
  it("drops malformed values instead of echoing them", () => {
    const p = parseListingParams({ machine: "<script>", brand: "a b", sort: "price", page: "-4", stock: "maybe" });
    expect(p).toMatchObject({ machine: "", brand: "", sort: DEFAULT_SORT, page: 1, inStock: false });
    expect(parseListingParams({ page: "99999" }).page).toBe(1000);
    expect(parseListingParams({ page: "abc" }).page).toBe(1);
  });
  it("never offers price sorting (quote-first)", () => {
    expect(parseListingParams({ sort: "price" }).sort).toBe(DEFAULT_SORT);
    expect(parseListingParams({ sort: "-price" }).sort).toBe(DEFAULT_SORT);
  });
});

describe("listingQuery / hasActiveFilters", () => {
  it("omits defaults and resets to page 1 via patch", () => {
    const p = parseListingParams({ machine: "m", stock: "1", page: "4" });
    expect(listingQuery(p)).toEqual({ machine: "m", stock: "1", page: "4" });
    expect(listingQuery(p, { page: 1, machine: "" })).toEqual({ stock: "1" });
    expect(listingQuery(parseListingParams({}))).toEqual({});
  });
  it("a machine model wins over its brand", () => {
    expect(listingQuery(parseListingParams({ machine: "m", mbrand: "juki" }))).toEqual({ machine: "m" });
  });
  it("detects facets", () => {
    expect(hasActiveFilters(parseListingParams({}))).toBe(false);
    expect(hasActiveFilters(parseListingParams({ page: "2" }))).toBe(false);
    expect(hasActiveFilters(parseListingParams({ sort: "name" }))).toBe(true);
    expect(hasActiveFilters(parseListingParams({ stock: "1" }))).toBe(true);
  });
});

describe("applyListing", () => {
  const parts = [
    part({ slug: "b", name: "Bobbin", availability: "out_of_stock", machineModelSlugs: ["m1"], machineBrandSlugs: ["juki"] }),
    part({ slug: "a", name: "Awl", availability: "low_stock", brandSlug: "hikari", createdAt: "2026-05-01T00:00:00Z" }),
    part({ slug: "c", name: "Cam", availability: "in_stock", machineModelSlugs: ["m2"], machineBrandSlugs: ["brother"] }),
    part({ slug: "d", name: "Dog 10", availability: "on_request", machineModelSlugs: ["m1"], machineBrandSlugs: ["juki"] }),
    part({ slug: "e", name: "Dog 9", availability: "in_stock" }),
  ];

  it("sorts by availability (in stock first), then name", () => {
    expect(applyListing(parts, parseListingParams({})).rows.map((p) => p.slug)).toEqual(["c", "e", "a", "d", "b"]);
  });
  it("sorts by name naturally and by newest", () => {
    expect(applyListing(parts, parseListingParams({ sort: "name" })).rows.map((p) => p.slug)).toEqual(["a", "b", "c", "e", "d"]);
    expect(applyListing(parts, parseListingParams({ sort: "newest" })).rows[0].slug).toBe("a");
  });
  it("filters by machine model, machine brand, parts brand and stock", () => {
    const slugs = (sp: Record<string, string>) => applyListing(parts, parseListingParams(sp)).rows.map((p) => p.slug).sort();
    expect(slugs({ machine: "m1" })).toEqual(["b", "d"]);
    expect(slugs({ mbrand: "brother" })).toEqual(["c"]);
    expect(slugs({ brand: "hikari" })).toEqual(["a"]);
    expect(slugs({ stock: "1" })).toEqual(["a", "c", "e"]);
    expect(slugs({ machine: "m1", stock: "1" })).toEqual([]);
  });
  it("paginates and clamps the page", () => {
    const many = Array.from({ length: 30 }, (_, i) => part({ slug: `p${String(i).padStart(2, "0")}`, name: `P${String(i).padStart(2, "0")}` }));
    const page2 = applyListing(many, parseListingParams({ page: "2", sort: "name" }), 24);
    expect(page2).toMatchObject({ total: 30, page: 2, pageCount: 2 });
    expect(page2.rows).toHaveLength(6);
    expect(applyListing(many, parseListingParams({ page: "9" }), 24).page).toBe(2);
    expect(applyListing([], parseListingParams({ page: "3" }))).toMatchObject({ total: 0, page: 1, pageCount: 1 });
  });
});

describe("pageWindow", () => {
  it("collapses long ranges", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageWindow(2, 12)).toEqual([1, 2, 3, "gap", 12]);
  });
});
