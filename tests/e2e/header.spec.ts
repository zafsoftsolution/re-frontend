import { expect, test } from "@playwright/test";

/**
 * Header mega-menu (desktop) and menu sheet (mobile). Data-independent: the
 * Parts / Devices panels only exist when the catalogue has such categories,
 * so those tests skip when the trigger is a plain link.
 */
const mainNav = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Main navigation" }).first();

test.describe("desktop mega-menu", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("never says just 'Machines'; offers parts, devices and parts-by-machine", async ({ page }) => {
    await page.goto("/");
    const nav = mainNav(page);
    await expect(nav).toContainText("Parts");
    await expect(nav).toContainText("Parts by machine");
    await expect(nav.getByRole("link", { name: "Request a quote" })).toBeVisible();
    expect(await nav.getByText(/^Machines$/).count()).toBe(0);
  });

  test("keyboard: Enter toggles, ArrowDown focuses the panel, Esc closes and restores focus", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const trigger = mainNav(page).getByRole("button", { name: "Parts", exact: true });
    test.skip((await trigger.count()) === 0, "no part categories");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("ArrowDown");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panelId = await trigger.getAttribute("aria-controls");
    await expect(page.locator(`[id="${panelId}"] a`).first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });

  test("mouse: hover intent opens, outside click closes, page does not move", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const trigger = mainNav(page).getByRole("button", { name: "Parts", exact: true });
    test.skip((await trigger.count()) === 0, "no part categories");
    const top = await page.locator("main").evaluate((el) => el.getBoundingClientRect().top);
    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await page.locator("main").evaluate((el) => el.getBoundingClientRect().top)).toBe(top);
    await page.mouse.click(720, 880);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("without JS the nav is plain links", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    const hrefs = await mainNav(page).locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual(expect.arrayContaining(["/categories", "/machines", "/brands", "/rfq"]));
    await ctx.close();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bottom bar has Devices (no machine tab); sheet has Parts accordion", async ({ page }) => {
    await page.goto("/");
    const devices = page.getByRole("navigation", { name: "Quick actions" }).getByRole("link", { name: "Devices" });
    await expect(devices).toHaveAttribute("href", "/categories#devices");
    await page.getByRole("button", { name: /open menu/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link", { name: "Find by model no." })).toBeVisible();
    const acc = dialog.getByRole("button", { name: /^Parts/ });
    if (await acc.count()) {
      await acc.click();
      await expect(acc).toHaveAttribute("aria-expanded", "true");
    }
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
  });
});
