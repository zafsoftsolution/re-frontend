import { describe, expect, it } from "vitest";
import { resolveSitemap } from "next/dist/build/webpack/loaders/metadata/resolve-route-data";
import {
  childLastModified,
  EMPTY_FEED,
  localizedPath,
  parseSitemapFeed,
  PARTS_PER_SITEMAP,
  sitemapEntries,
  sitemapIds,
  sitemapIndexXml,
  STATIC_PAGES,
} from "@/lib/seo/sitemap";
import { GUIDES } from "@/content/guides";
import { xmlProblems, xmlValues } from "./helpers/xml";

const SITE = "https://rakibenterprise-bd.com";
const guides = GUIDES.map((g) => ({ slug: g.slug, updated: g.updated }));
const ctx = { siteUrl: SITE, guides };

const RAW = {
  products: [
    { slug: "organ-db1-14", updated_at: "2026-11-03T22:57:08.211880+00:00", image: "https://placehold.co/900x900?text=A&b=1" },
    { slug: "no-image", updated_at: "2026-10-01T00:00:00+00:00", image: "" },
    { slug: "", updated_at: null, image: "" },
  ],
  machine_brands: [{ slug: "juki", updated_at: "2026-11-03T22:53:51.814339+00:00", model_count: 6 }],
  machine_models: [
    { slug: "juki-ddl-8700", brand_slug: "juki", updated_at: "2026-11-02T10:00:00+00:00", parts_count: 9 },
    { slug: "orphan", brand_slug: "nobrand", updated_at: null, parts_count: 1 },
  ],
  model_categories: [
    { brand_slug: "juki", model_slug: "juki-ddl-8700", category_slug: "needles", count: 4 },
    { brand_slug: "juki", model_slug: "juki-ddl-8700", category_slug: "belts", count: 2 },
    { brand_slug: "brother", model_slug: "juki-ddl-8700", category_slug: "hooks", count: 5 },
  ],
  categories: [{ slug: "needles", parent_slug: null, updated_at: "2026-11-01T00:00:00+00:00", product_count: 4 }],
  brands: [{ slug: "organ", updated_at: "2026-11-01T00:00:00+00:00", product_count: 2, is_oem: false }],
};

const feed = parseSitemapFeed(RAW)!;
const render = (id: string) => resolveSitemap(sitemapEntries(id, feed, ctx)!);
const locs = (xml: string) => xmlValues(xml, "loc");

describe("parseSitemapFeed", () => {
  it("maps the backend contract and drops rows without a slug", () => {
    expect(feed.products.map((p) => p.slug)).toEqual(["organ-db1-14", "no-image"]);
    expect(feed.machineModels[0]).toEqual({ slug: "juki-ddl-8700", brandSlug: "juki", updatedAt: "2026-11-02T10:00:00+00:00", partsCount: 9 });
    expect(feed.categories[0].parentSlug).toBeNull();
  });
  it("rejects anything that isn't the feed", () => {
    expect(parseSitemapFeed(null)).toBeNull();
    expect(parseSitemapFeed([])).toBeNull();
    expect(parseSitemapFeed({ results: [] })).toBeNull();
  });
});

describe("sitemap ids", () => {
  it("one file per type plus parts chunks (always at least one)", () => {
    expect(sitemapIds(EMPTY_FEED)).toEqual([
      "pages",
      "guides",
      "machine-brands",
      "machine-models",
      "model-categories",
      "categories",
      "brands",
      "parts-0",
    ]);
    const big = {
      ...EMPTY_FEED,
      products: Array.from({ length: PARTS_PER_SITEMAP * 2 + 1 }, (_, i) => ({ slug: `p${i}`, updatedAt: null, image: "" })),
    };
    expect(sitemapIds(big).filter((i) => i.startsWith("parts-"))).toEqual(["parts-0", "parts-1", "parts-2"]);
    expect(sitemapEntries("parts-1", big, ctx)).toHaveLength(PARTS_PER_SITEMAP * 2);
    expect(PARTS_PER_SITEMAP * 2).toBeLessThanOrEqual(10_000);
    expect(sitemapEntries("parts-2", big, ctx)).toHaveLength(2);
    expect(sitemapEntries("parts-3", big, ctx)).toBeNull();
    expect(sitemapEntries("nope", big, ctx)).toBeNull();
  });
});

describe("child sitemaps", () => {
  it.each(sitemapIds(feed))("%s renders well-formed XML with absolute https URLs and full hreflang", (id) => {
    const entries = sitemapEntries(id, feed, ctx)!;
    const xml = resolveSitemap(entries);
    expect(xmlProblems(xml)).toEqual([]);
    for (const loc of locs(xml)) expect(loc).toMatch(/^https:\/\/rakibenterprise-bd\.com\//);
    for (const e of entries) {
      const langs = e.alternates!.languages! as Record<string, string>;
      expect(Object.keys(langs)).toEqual(["en", "bn", "x-default"]);
      expect(langs["x-default"]).toBe(langs.en);
      expect([langs.en, langs.bn]).toContain(e.url);
    }
  });

  it("lists every page in en and bn", () => {
    const xml = render("machine-models");
    expect(locs(xml)).toEqual([`${SITE}/machines/juki/juki-ddl-8700`, `${SITE}/bn/machines/juki/juki-ddl-8700`]);
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://rakibenterprise-bd.com/machines/juki/juki-ddl-8700" />',
    );
    expect(xml).toContain("<lastmod>2026-11-02T10:00:00+00:00</lastmod>");
  });

  it("parts carry image entries (XML-escaped) and lastmod", () => {
    const xml = render("parts-0");
    expect(xml).toContain("<image:loc>https://placehold.co/900x900?text=A&amp;b=1</image:loc>");
    expect(locs(xml)).toContain(`${SITE}/bn/parts/organ-db1-14`);
    expect(xml.match(/<image:image>/g)).toHaveLength(2);
  });

  it("model x category only with at least 3 parts, under the model's real brand", () => {
    expect(locs(render("model-categories"))).toEqual([
      `${SITE}/machines/juki/juki-ddl-8700/needles`,
      `${SITE}/bn/machines/juki/juki-ddl-8700/needles`,
    ]);
  });

  it("static pages: indexable routes only - no search, rfq/sent, cart, checkout, account, admin or query URLs", () => {
    const all = locs(render("pages"));
    expect(all).toHaveLength(STATIC_PAGES.length * 2);
    expect(all).toContain(`${SITE}/`);
    expect(all).toContain(`${SITE}/bn`);
    expect(all).toContain(`${SITE}/rfq`);
    for (const u of all) {
      expect(u).not.toMatch(/\/(search|cart|checkout|account|admin|login)(\/|$)|\/rfq\/sent|\?/);
    }
  });

  it("guides come from src/content with their updated date", () => {
    const xml = render("guides");
    expect(locs(xml)).toHaveLength(GUIDES.length * 2);
    expect(xml).toContain(`<lastmod>${GUIDES[0].updated}</lastmod>`);
  });

  it("percent-encodes unicode slugs", () => {
    const uni = parseSitemapFeed({ ...RAW, categories: [{ slug: "সুই", updated_at: null, product_count: 1 }] })!;
    const xml = resolveSitemap(sitemapEntries("categories", uni, ctx)!);
    expect(locs(xml)[0]).toBe(`${SITE}/categories/%E0%A6%B8%E0%A7%81%E0%A6%87`);
  });
});

describe("sitemap index", () => {
  it("lists every child with its newest lastmod", () => {
    const children = sitemapIds(feed).map((id) => ({ id, lastModified: childLastModified(sitemapEntries(id, feed, ctx)!) }));
    const xml = sitemapIndexXml(SITE, children);
    expect(xmlProblems(xml)).toEqual([]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(locs(xml)).toEqual(sitemapIds(feed).map((id) => `${SITE}/sitemap/${id}.xml`));
    expect(children.find((c) => c.id === "parts-0")!.lastModified).toBe("2026-11-03T22:57:08.211880+00:00");
  });
});

describe("localizedPath", () => {
  it("matches next-intl's as-needed prefixing", () => {
    expect(localizedPath("/", "en")).toBe("/");
    expect(localizedPath("/", "bn")).toBe("/bn");
    expect(localizedPath("/parts/x", "bn")).toBe("/bn/parts/x");
  });
});
