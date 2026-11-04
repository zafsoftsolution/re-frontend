import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * SEO surface against a running build: sitemap index + children, robots,
 * llms.txt, manifest, legacy redirects, per-page metadata and JSON-LD.
 * Catalogue URLs are discovered from the sitemaps, so this works on any data.
 */
const SITE = "https://rakibenterprise-bd.com";
const local = (absolute: string) => absolute.replace(SITE, "") || "/";
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

async function sitemapUrls(request: APIRequestContext, child: string): Promise<string[]> {
  const res = await request.get(`/sitemap/${child}.xml`);
  expect(res.status()).toBe(200);
  return locs(await res.text());
}

async function jsonLd(request: APIRequestContext, path: string) {
  const res = await request.get(path);
  expect(res.status(), path).toBe(200);
  const html = await res.text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const types = blocks.flatMap((b) => (b["@graph"] ? b["@graph"].map((n: { "@type": string }) => n["@type"]) : [b["@type"]]));
  return { html, blocks, types };
}

test.describe("sitemaps", () => {
  test("index lists every child; children are valid urlsets with hreflang", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    const children = locs(xml);
    expect(children.map((u) => u.replace(`${SITE}/sitemap/`, ""))).toEqual(
      expect.arrayContaining(["pages.xml", "guides.xml", "machine-brands.xml", "machine-models.xml", "categories.xml", "brands.xml", "parts-0.xml"]),
    );
    for (const child of children) {
      const r = await request.get(local(child));
      expect(r.status(), child).toBe(200);
      expect(r.headers()["content-type"], child).toContain("xml");
      const body = await r.text();
      expect(body, child).toContain("<urlset");
      for (const loc of locs(body)) {
        expect(loc.startsWith(`${SITE}/`) || /^https?:\/\//.test(loc), loc).toBe(true);
        expect(loc).not.toMatch(/\/(search|cart|checkout|admin)(\/|\?|$)|\/rfq\/sent/);
      }
      const urls = (body.match(/<url>/g) ?? []).length;
      expect((body.match(/hreflang="x-default"/g) ?? []).length, child).toBe(urls);
    }
  });
});

test("robots.txt allows AI crawlers and points at the index", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  for (const ua of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(txt).toContain(`User-Agent: ${ua}`);
  expect(txt).toContain("Disallow: /admin");
  expect(txt).toContain("Disallow: /rfq/sent");
  expect(txt).toMatch(/Sitemap: https:\/\/[^\s]+\/sitemap\.xml/);
});

test("llms.txt is plain-text markdown", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  const txt = await res.text();
  expect(txt).toMatch(/^# .+\n\n> /);
  expect(txt).toContain("/rfq)");
});

test("web app manifest", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.short_name).toBe("Rakib");
  expect(m.icons.length).toBeGreaterThan(0);
});

test("old storefront URLs redirect permanently", async ({ request }) => {
  const [part] = await sitemapUrls(request, "parts-0");
  test.skip(!part, "no parts in the catalogue");
  const slug = local(part).split("/").pop();
  const res = await request.get(`/products/${slug}?ref=old`, { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toMatch(new RegExp(`/parts/${slug}\\?ref=old$`));
  for (const [from, to] of [
    ["/collections/summer", "/"],
    ["/wishlist", "/rfq"],
    ["/bn/products", "/bn/categories"],
  ]) {
    const r = await request.get(from, { maxRedirects: 0 });
    expect(r.status(), from).toBe(308);
    expect(new URL(r.headers().location, "http://x").pathname, from).toBe(to);
  }
});

test.describe("metadata + JSON-LD", () => {
  test("home: WebSite SearchAction + Organization/Store, canonical and hreflang", async ({ request }) => {
    const { html, types, blocks } = await jsonLd(request, "/");
    expect(types).toEqual(expect.arrayContaining(["WebSite", "Organization", "Store"]));
    const site = blocks.find((b) => b["@type"] === "WebSite");
    expect(site.potentialAction.target.urlTemplate).toContain("/search?q={search_term_string}");
    expect(html).toMatch(/<html[^>]*lang="en"/);
    expect(html).toContain('<link rel="canonical" href="https://rakibenterprise-bd.com"');
    expect(html).toMatch(/hrefLang="bn" href="https:\/\/rakibenterprise-bd\.com\/bn"/);
    expect(html).toMatch(/hrefLang="x-default"/);
  });

  test("part: Product without offers (quote-first) + BreadcrumbList", async ({ request }) => {
    const [part] = await sitemapUrls(request, "parts-0");
    test.skip(!part, "no parts in the catalogue");
    const { types, blocks, html } = await jsonLd(request, local(part));
    expect(types).toEqual(expect.arrayContaining(["Product", "BreadcrumbList", "Organization", "Store"]));
    const product = blocks.find((b) => b["@type"] === "Product");
    expect(product.name).toBeTruthy();
    if (!product.offers) expect(JSON.stringify(product)).not.toMatch(/"price"/);
    expect(html).toContain(`<link rel="canonical" href="${part}"`);
  });

  test("bn part page has lang=bn and its own canonical", async ({ request }) => {
    const urls = await sitemapUrls(request, "parts-0");
    const bn = urls.find((u) => u.includes("/bn/"));
    test.skip(!bn, "no parts in the catalogue");
    const html = await (await request.get(local(bn!))).text();
    expect(html).toMatch(/<html[^>]*lang="bn"/);
    expect(html).toContain(`<link rel="canonical" href="${bn}"`);
  });

  test("machine model: ItemList + BreadcrumbList", async ({ request }) => {
    const [model] = await sitemapUrls(request, "machine-models");
    test.skip(!model, "no machine models");
    const { types } = await jsonLd(request, local(model));
    expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "ItemList"]));
  });

  test("guide: Article", async ({ request }) => {
    const [guide] = await sitemapUrls(request, "guides");
    const { blocks } = await jsonLd(request, local(guide));
    const article = blocks.find((b) => b["@type"] === "Article");
    expect(article.headline).toBeTruthy();
    expect(article.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  test("search and filtered listings are noindex, follow", async ({ request }) => {
    const search = await (await request.get("/search?q=needle")).text();
    expect(search).toContain('<meta name="robots" content="noindex, follow"/>');
    const [category] = await sitemapUrls(request, "categories");
    test.skip(!category, "no categories");
    const filtered = await (await request.get(`${local(category)}?sort=newest`)).text();
    expect(filtered).toContain('<meta name="robots" content="noindex, follow"/>');
    expect(filtered).toContain(`<link rel="canonical" href="${category}"`);
  });
});
