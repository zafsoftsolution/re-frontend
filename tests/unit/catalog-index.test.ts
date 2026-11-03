import { describe, expect, it, vi } from "vitest";
import {
  guardCatalogPath,
  indexFromLists,
  isValidSlug,
  parseSitemapIndex,
  type CatalogLookup,
} from "@/lib/api/catalog-index";
import type { CatalogIndex } from "@/lib/api/types";

const FEED = {
  products: [{ slug: "hook-ddl" }, { slug: "needle-db1" }],
  machine_brands: [{ slug: "juki", model_count: 2 }, { slug: "brother" }],
  machine_models: [
    { slug: "juki-ddl-8700", brand_slug: "juki", parts_count: 7 },
    { slug: "brother-s-7200c", brand_slug: "brother", parts_count: 4 },
  ],
  model_categories: [
    { brand_slug: "juki", model_slug: "juki-ddl-8700", category_slug: "needles", count: 4 },
    { brand_slug: "juki", model_slug: "juki-ddl-8700", category_slug: "thin", count: 2 },
  ],
  categories: [{ slug: "needles", product_count: 3 }],
  brands: [{ slug: "organ", product_count: 3 }],
};

function lookup(index: CatalogIndex | null, extra: Partial<CatalogLookup> = {}): CatalogLookup {
  return {
    index: vi.fn(async () => index),
    partExists: vi.fn(async () => undefined),
    model: vi.fn(async () => undefined),
    ...extra,
  };
}

describe("parseSitemapIndex", () => {
  it("parses the sitemap feed and keeps only ≥3-part model categories", () => {
    const ix = parseSitemapIndex(FEED)!;
    expect(ix.parts).toEqual(["hook-ddl", "needle-db1"]);
    expect(ix.machineBrands).toEqual(["juki", "brother"]);
    expect(ix.machineModels[0]).toEqual({ slug: "juki-ddl-8700", brandSlug: "juki", partsCount: 7 });
    expect(ix.modelCategories.map((r) => r.categorySlug)).toEqual(["needles"]);
    expect(ix.complete).toEqual({ parts: true, modelCategories: true });
  });
  it("rejects payloads that are not the feed", () => {
    expect(parseSitemapIndex(null)).toBeNull();
    expect(parseSitemapIndex([])).toBeNull();
    expect(parseSitemapIndex({ results: [] })).toBeNull();
  });
  it("list fallback marks parts and combos as not enumerable", () => {
    const ix = indexFromLists({
      machineBrands: [{ slug: "juki" }],
      machineModels: [{ slug: "m1", machine_brand_slug: "juki", parts_count: 1 }],
      categories: [],
      brands: [],
    });
    expect(ix.machineModels).toEqual([{ slug: "m1", brandSlug: "juki", partsCount: 1 }]);
    expect(ix.complete).toEqual({ parts: false, modelCategories: false });
  });
});

describe("isValidSlug", () => {
  it.each(["juki", "juki-ddl-8700", "b1101_012", "সুই-১"])("accepts %s", (s) => expect(isValidSlug(s)).toBe(true));
  it.each(["", "a.b", "..", "a%2Fb", "%E0%A4", "a b", "x".repeat(201)])("rejects %j", (s) => expect(isValidSlug(s)).toBe(false));
});

describe("guardCatalogPath", () => {
  const ix = parseSitemapIndex(FEED)!;

  it("passes non-catalogue sections and index pages", async () => {
    const l = lookup(ix);
    expect(await guardCatalogPath(["rfq"], l)).toEqual({ kind: "ok" });
    expect(await guardCatalogPath(["machines"], l)).toEqual({ kind: "ok" });
    expect(await guardCatalogPath(["machines", "find"], l)).toEqual({ kind: "ok" });
    expect(await guardCatalogPath(["parts"], l)).toEqual({ kind: "redirect", path: "/categories", permanent: false });
  });

  it("404s unknown slugs and malformed or too-deep paths", async () => {
    const l = lookup(ix);
    expect((await guardCatalogPath(["machines", "nope"], l)).kind).toBe("not-found");
    expect((await guardCatalogPath(["machines", "juki", "nope"], l)).kind).toBe("ok"); // unknown to index → model() undefined → let through
    expect((await guardCatalogPath(["parts", "nope"], l)).kind).toBe("not-found");
    expect((await guardCatalogPath(["categories", "nope"], l)).kind).toBe("not-found");
    expect((await guardCatalogPath(["brands", "nope"], l)).kind).toBe("not-found");
    expect((await guardCatalogPath(["parts", "a.b"], l)).kind).toBe("not-found");
    expect((await guardCatalogPath(["categories", "needles", "x"], l)).kind).toBe("not-found");
    expect((await guardCatalogPath(["machines", "juki", "juki-ddl-8700", "needles", "x"], l)).kind).toBe("not-found");
  });

  it("re-checks a fresh index before 404-ing a miss", async () => {
    const index = vi.fn(async (opts?: { refresh?: boolean }) =>
      opts?.refresh ? { ...ix, parts: [...ix.parts, "brand-new"] } : ix,
    );
    expect((await guardCatalogPath(["parts", "brand-new"], { ...lookup(ix), index })).kind).toBe("ok");
    expect(index).toHaveBeenCalledWith({ refresh: true });
  });

  it("accepts known entities", async () => {
    const l = lookup(ix);
    expect((await guardCatalogPath(["machines", "juki"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["machines", "juki", "juki-ddl-8700"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["machines", "juki", "juki-ddl-8700", "needles"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["parts", "hook-ddl"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["categories", "needles"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["brands", "organ"], l)).kind).toBe("ok");
  });

  it("redirects a model under the wrong brand to its canonical URL", async () => {
    expect(await guardCatalogPath(["machines", "brother", "juki-ddl-8700"], lookup(ix))).toEqual({
      kind: "redirect",
      path: "/machines/juki/juki-ddl-8700",
      permanent: true,
    });
  });

  it("sends thin model × category combos to the model page, 404s empty ones", async () => {
    const l = lookup(ix, {
      model: vi.fn(async () => ({ brandSlug: "juki", categories: [{ slug: "thin", count: 2 }, { slug: "needles", count: 4 }] })),
    });
    expect(await guardCatalogPath(["machines", "juki", "juki-ddl-8700", "thin"], l)).toEqual({
      kind: "redirect",
      path: "/machines/juki/juki-ddl-8700#cat-thin",
      permanent: false,
    });
    expect((await guardCatalogPath(["machines", "juki", "juki-ddl-8700", "feed-dogs"], l)).kind).toBe("not-found");
  });

  it("confirms parts by detail lookup when the index can't enumerate them", async () => {
    const partial = indexFromLists({ machineBrands: [], machineModels: [], categories: [], brands: [] });
    const partExists = vi.fn(async (slug: string) => slug === "real");
    expect((await guardCatalogPath(["parts", "real"], lookup(partial, { partExists }))).kind).toBe("ok");
    expect((await guardCatalogPath(["parts", "fake"], lookup(partial, { partExists }))).kind).toBe("not-found");
  });

  it("fails open when the backend is unreachable", async () => {
    const l = lookup(null);
    expect((await guardCatalogPath(["machines", "anything"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["categories", "anything"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["parts", "anything"], l)).kind).toBe("ok");
    expect((await guardCatalogPath(["machines", "juki", "m", "c"], l)).kind).toBe("ok");
  });
});
