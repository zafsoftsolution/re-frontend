import { expect, test } from "@playwright/test";
import path from "node:path";

const SHOTS = process.env.SCREENSHOT_DIR || path.join("test-results", "screens");

const pages = [
  { name: "home-en", path: "/", lang: "en" },
  { name: "home-bn", path: "/bn", lang: "bn" },
  { name: "admin-login", path: "/admin/login", lang: "en" },
] as const;

for (const p of pages) {
  test(`${p.path} returns 200 and renders the logo`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", p.lang);
    const logo = page.locator('img[src*="rakib-enterprise"]').first();
    await expect(logo).toBeVisible();
    // naturalWidth > 0 → the image actually loaded (not a broken icon).
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });
}

test("unknown public paths are real 404s in the localized shell", async ({ page }) => {
  for (const [url, lang] of [["/no-such-page", "en"], ["/bn/no-such-page", "bn"]] as const) {
    const res = await page.goto(url);
    expect(res?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.getByText("404").first()).toBeVisible();
  }
});

test("language switch keeps the path", async ({ page }) => {
  await page.goto("/rfq");
  await page.getByRole("link", { name: "View this page in Bangla" }).first().click();
  await expect(page).toHaveURL(/\/bn\/rfq$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
});

test("header search submits to /search", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const box = page.getByRole("search").first().getByRole("searchbox");
  await box.fill("B1101-012-000");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=B1101-012-000/);
});

test.describe("screenshots", () => {
  for (const width of [390, 1440]) {
    for (const p of [...pages, { name: "search", path: "/search?q=juki", lang: "en" }, { name: "rfq-bn", path: "/bn/rfq", lang: "bn" }, { name: "404", path: "/no-such-page", lang: "en" }]) {
      test(`${p.name} @${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
        await page.goto(p.path, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(SHOTS, `${p.name}-${width}.png`), fullPage: true });
      });
    }
  }
});
