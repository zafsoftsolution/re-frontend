import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Phase 2 catalogue pages. Slugs are discovered from the pages themselves
 * (machines index → brand → model → part), so this runs against any
 * backend with at least one machine brand, model and part — e.g. a local
 * Django with `manage.py seed_demo`. Tests that need data skip without it.
 */
const SHOTS = process.env.SCREENSHOT_DIR || path.join("test-results", "screens");

async function firstHref(page: Page, url: string, pattern: RegExp): Promise<string | null> {
  await page.goto(url);
  const hrefs = await page.locator("main a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  return hrefs.find((h) => pattern.test(h)) ?? null;
}

interface Paths {
  brand: string | null;
  model: string | null;
  modelCategory: string | null;
  part: string | null;
  category: string | null;
  partsBrand: string | null;
}

let cached: Paths | null = null;
async function discover(page: Page): Promise<Paths> {
  if (cached) return cached;
  const brand = await firstHref(page, "/machines", /^\/machines\/[^/]+$/);
  const model = brand ? await firstHref(page, brand, /^\/machines\/[^/]+\/[^/#]+$/) : null;
  // A model × category page exists only with ≥ 3 parts — look across brands.
  let modelCategory: string | null = null;
  await page.goto("/machines");
  const brands = (await page.locator("main a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? "")))
    .filter((h) => /^\/machines\/[^/]+$/.test(h))
    .slice(0, 6);
  for (const b of brands) {
    await page.goto(b);
    const models = (await page.locator("main a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? "")))
      .filter((h) => /^\/machines\/[^/]+\/[^/#]+$/.test(h))
      .slice(0, 6);
    for (const m of models) {
      modelCategory = await firstHref(page, m, /^\/machines\/[^/]+\/[^/]+\/[^/#]+$/);
      if (modelCategory) break;
    }
    if (modelCategory) break;
  }
  const part = model ? await firstHref(page, model, /^\/parts\/[^/]+$/) : null;
  const category = await firstHref(page, "/categories", /^\/categories\/[^/]+$/);
  const partsBrand = await firstHref(page, "/brands", /^\/brands\/[^/]+$/);
  cached = { brand, model, modelCategory, part, category, partsBrand };
  return cached;
}

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.map((r) => JSON.parse(r) as Record<string, unknown>);
}

test.describe("catalogue", () => {
  for (const [p, lang] of [
    ["/machines", "en"],
    ["/bn/machines", "bn"],
    ["/categories", "en"],
    ["/brands", "en"],
  ] as const) {
    test(`${p} renders with breadcrumb JSON-LD`, async ({ page }) => {
      const res = await page.goto(p);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("h1")).toBeVisible();
      const types = (await jsonLd(page)).map((d) => d["@type"]);
      expect(types).toContain("BreadcrumbList");
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    });
  }

  test("every detail page type renders (en + bn) with valid JSON-LD", async ({ page }) => {
    const paths = await discover(page);
    const list = [paths.brand, paths.model, paths.modelCategory, paths.part, paths.category, paths.partsBrand].filter(
      (x): x is string => Boolean(x),
    );
    test.skip(list.length === 0, "no catalogue data on this backend");
    for (const p of list) {
      for (const prefix of ["", "/bn"]) {
        // next-intl remembers /bn in a cookie and redirects unprefixed URLs.
        await page.context().clearCookies();
        const res = await page.goto(`${prefix}${p}`);
        expect(res?.status(), `${prefix}${p}`).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", prefix ? "bn" : "en");
        await expect(page.locator("h1")).toHaveCount(1);
        const ld = await jsonLd(page);
        expect(ld.length).toBeGreaterThan(0);
        expect(ld.map((d) => d["@type"])).toContain("BreadcrumbList");
      }
    }
  });

  test("model page lists parts grouped by category with an ItemList", async ({ page }) => {
    const { model } = await discover(page);
    test.skip(!model, "no machine model");
    await page.goto(model!);
    await expect(page.locator("main h1 .re-mono").first()).toBeVisible();
    expect((await jsonLd(page)).map((d) => d["@type"])).toContain("ItemList");
    await expect(page.locator('main section[id^="cat-"]').first()).toBeVisible();
  });

  test("unknown catalogue slugs are real 404s", async ({ request }) => {
    for (const url of [
      "/machines/no-such-brand",
      "/bn/machines/no-such-brand",
      "/parts/no-such-part",
      "/bn/parts/no-such-part",
      "/categories/no-such-category",
      "/brands/no-such-brand",
      "/parts/bad.slug",
      "/categories/x/y",
    ]) {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status(), url).toBe(404);
    }
  });

  test("unknown model and model × category are 404s", async ({ page, request }) => {
    const { brand, model } = await discover(page);
    test.skip(!brand || !model, "no machine model");
    expect((await request.get(`${brand}/no-such-model`, { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get(`${model}/no-such-category`, { maxRedirects: 0 })).status()).toBe(404);
  });

  test("quote part: no price anywhere, Product JSON-LD without offers, add to quote updates the count", async ({ page }) => {
    const { part } = await discover(page);
    test.skip(!part, "no part");
    await page.goto(part!);
    const product = (await jsonLd(page)).find((d) => d["@type"] === "Product");
    expect(product).toBeTruthy();
    expect(typeof product!.mpn === "string" || product!.mpn === undefined).toBe(true);

    const priceOnRequest = await page.getByText("Price on request").first().isVisible().catch(() => false);
    if (priceOnRequest) {
      // Quote part: no Offer, and no taka amount in the buy box.
      expect(product).not.toHaveProperty("offers");
      const box = page.locator("main").getByText("Price on request").first().locator("xpath=ancestor::div[contains(@class,'border-re-ink')][1]");
      await expect(box).not.toContainText("৳");
    }

    const quoteLink = page.locator('header a[href="/rfq"]').first();
    const before = Number((await quoteLink.textContent())?.match(/\d+/)?.[0] ?? 0);
    await page.locator("main").getByRole("button", { name: /add to quote/i }).first().click();
    await expect(page.locator("main").getByText(/added to quote/i).first()).toBeVisible();
    await expect(quoteLink).toContainText(String(before + 1));
  });

  test("WhatsApp this part is prefilled with the part number", async ({ page }) => {
    const { part } = await discover(page);
    test.skip(!part, "no part");
    await page.goto(part!);
    const wa = page.getByRole("link", { name: /whatsapp this part/i });
    const href = (await wa.getAttribute("href")) ?? "";
    if (href.startsWith("https://wa.me/")) {
      const text = decodeURIComponent(href.split("text=")[1] ?? "");
      const pn = (await page.locator("main [translate=no].re-mono").first().textContent())?.trim() ?? "";
      if (pn) expect(text).toContain(pn);
      expect(text).toContain("/parts/");
    } else {
      expect(href).toMatch(/\/contact$/);
    }
  });

  test("category filters are URL params and work without JS", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    // Not the first category: one with parts to filter.
    const category = await firstHref(page, "/categories", /^\/categories\/[^/]+$/);
    test.skip(!category, "no category");
    await page.goto(category!);
    await page.locator("aside form").getByLabel(/in stock only/i).check();
    await page.locator("aside form").getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/stock=1/);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
    await ctx.close();
  });

  test("search rows link to part pages", async ({ page }) => {
    await page.goto("/search?q=a");
    const links = await page.locator('main a[href^="/parts/"]').count();
    const empty = await page.getByText(/nothing found/i).count();
    expect(links > 0 || empty > 0).toBe(true);
  });
});

test.describe("catalogue screenshots", () => {
  for (const width of [390, 1440]) {
    test(`all page types @${width}`, async ({ page }) => {
      test.setTimeout(180_000);
      const paths = await discover(page);
      const shots: [string, string | null][] = [
        ["machines", "/machines"],
        ["machines-bn", "/bn/machines"],
        ["brand", paths.brand],
        ["brand-bn", paths.brand && `/bn${paths.brand}`],
        ["model", paths.model],
        ["model-bn", paths.model && `/bn${paths.model}`],
        ["model-category", paths.modelCategory],
        ["part", paths.part],
        ["part-bn", paths.part && `/bn${paths.part}`],
        ["categories", "/categories"],
        ["category", paths.category],
        ["category-bn", paths.category && `/bn${paths.category}`],
        ["brands", "/brands"],
        ["parts-brand", paths.partsBrand],
        ["catalog-404", "/parts/no-such-part"],
      ];
      for (const [name, url] of shots) {
        if (!url) continue;
        await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
        await page.context().clearCookies();
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`), fullPage: true });
      }
    });
  }
});
