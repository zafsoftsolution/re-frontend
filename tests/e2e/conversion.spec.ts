import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase 3b — conversion flows + content pages, against a running build
 * with a local Django (demo data). Data-dependent tests skip without it.
 *   DIRECT_PART=<slug of a direct-sale part> enables the checkout flow.
 */
const SHOTS = process.env.SCREENSHOT_DIR || path.join("test-results", "screens");
const DIRECT_PART = process.env.DIRECT_PART || "";
/** A part number that exists in the backend (exact-match test). */
const EXACT_PN = process.env.EXACT_PN || "B1109-552-H00";

// 1×1 PNG (valid signature — the backend sniffs file contents).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function firstPart(page: Page): Promise<string | null> {
  await page.goto("/search?q=juki");
  const href = await page.locator('main a[href^="/parts/"]').first().getAttribute("href").catch(() => null);
  return href;
}

test.describe("RFQ", () => {
  test("add to quote → /rfq → submit with a file → reference", async ({ page }) => {
    const part = await firstPart(page);
    test.skip(!part, "no parts in the backend");
    await page.goto(part!);
    await page.getByRole("button", { name: /add to quote/i }).first().click();
    await page.goto("/rfq");
    await expect(page.getByText(/from your quote list/i)).toBeVisible();

    await page.locator('input[name="line_pn"]').first().fill("B1109-552-H00");
    await page.locator('input[name="line_qty"]').first().fill("4");
    await page.locator('input[name="line_model"]').first().fill("DDL-8700");
    await page.locator('input[type="file"][multiple]').setInputFiles([
      { name: "old-part.png", mimeType: "image/png", buffer: PNG },
      { name: "list.csv", mimeType: "text/csv", buffer: Buffer.from("part_number,qty\nB1830-227-000,2\n") },
    ]);
    await expect(page.getByText("old-part.png")).toBeVisible();

    // Validation: bad phone → bilingual-coded error, no submit.
    await page.getByLabel(/mobile number/i).fill("12345");
    await page.getByRole("button", { name: /send quote request/i }).click();
    await expect(page.getByText(/valid Bangladesh phone/i).first()).toBeVisible();

    await page.getByLabel(/mobile number/i).fill("+880 1711-555666");
    await page.getByLabel(/company/i).fill("E2E Knit Ltd");
    await page.getByLabel(/^BIN/i).fill("000123456-0101");
    await page.locator("select").first().selectOption("Gazipur");
    await shot(page, "rfq-filled-1440");
    await page.getByRole("button", { name: /send quote request/i }).click();

    await page.waitForURL(/\/rfq\/sent\?ref=RFQ-/);
    const ref = (await page.getByTestId("rfq-reference").textContent())!.trim();
    expect(ref).toMatch(/^RFQ-\d{4}-\d+$/);
    fs.writeFileSync(path.join(SHOTS, "rfq-ref-js.txt"), ref);
    await expect(page.getByRole("link", { name: /follow up on whatsapp/i })).toHaveAttribute("href", new RegExp(encodeURIComponent(ref)));
    await shot(page, "rfq-sent-1440");

    // The quote list was cleared.
    await page.goto("/rfq");
    await expect(page.getByText(/quote list is empty/i)).toBeVisible();
  });

  test("works without JavaScript (free-text line + phone)", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/bn/rfq");
    await page.locator('input[name="line_pn"]').first().fill("DCX27-11");
    await page.locator('input[name="line_desc"]').first().fill("overlock needle, no-JS test");
    await page.locator('input[name="phone"]').fill("01811-222333");
    await page.locator('main form[action="/api/rfq"] button[type="submit"]').click();
    await page.waitForURL(/\/bn\/rfq\/sent\?ref=RFQ-/);
    const ref = (await page.getByTestId("rfq-reference").textContent())!.trim();
    fs.writeFileSync(path.join(SHOTS, "rfq-ref-nojs.txt"), ref);
    await ctx.close();
  });

  test("screens en/bn × 390/1440", async ({ page }) => {
    for (const [loc, prefix] of [["en", ""], ["bn", "/bn"]] as const) {
      for (const w of [390, 1440]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(`${prefix}/rfq`);
        await shot(page, `rfq-${loc}-${w}`);
        await page.goto(`${prefix}/contact`);
        await shot(page, `contact-${loc}-${w}`);
      }
    }
  });
});

test.describe("search", () => {
  test("exact part-number match is pinned and renders without JS", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    const pn = EXACT_PN;
    await page.goto(`/search?q=${encodeURIComponent(pn.toLowerCase().replace(/-/g, " "))}`);
    test.skip((await page.getByTestId("exact-match").count()) === 0 && (await page.getByTestId("search-empty").count()) > 0, `${pn} not in the backend`);
    await expect(page.getByTestId("exact-match")).toBeVisible();
    await expect(page.getByTestId("exact-match")).toContainText(pn);
    await shot(page, "search-exact-nojs-1440");
    await page.goto("/search?q=ZZQ-404-NOPE");
    await expect(page.getByTestId("search-empty")).toBeVisible();
    await expect(page.getByRole("link", { name: /request a quote for ZZQ-404-NOPE/i })).toBeVisible();
    await ctx.close();
  });

  test("search page is noindex", async ({ page }) => {
    await page.goto("/search?q=x");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("checkout (direct parts)", () => {
  test("cart → checkout COD → success with invoice", async ({ page, request }) => {
    test.skip(!DIRECT_PART, "set DIRECT_PART to a direct-sale part slug");
    await page.goto(`/parts/${DIRECT_PART}`);
    const add = page.getByRole("button", { name: /add to cart/i }).first();
    test.skip(!(await add.isVisible().catch(() => false)), "part is not direct / ordering disabled");
    await add.click();
    await page.goto("/cart");
    await expect(page.getByTestId("cart-subtotal")).toContainText("৳");
    await shot(page, "cart-1440");
    await page.getByRole("link", { name: /go to checkout/i }).click();
    await page.waitForURL(/\/checkout$/);
    await page.getByLabel(/full name/i).fill("E2E Buyer");
    await page.getByLabel(/mobile number/i).fill("01911-444555");
    await page.getByLabel(/division/i).selectOption("dhaka");
    await page.getByLabel(/^district/i).fill("Gazipur");
    await page.getByLabel(/area \/ thana/i).fill("Konabari");
    await page.getByLabel(/house, road/i).fill("Plot 12, E2E Knit Ltd, 3rd floor");
    await shot(page, "checkout-1440");
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/\/checkout\/success\?order=/);
    await expect(page.getByTestId("order-number")).not.toBeEmpty();
    await shot(page, "checkout-success-1440");
    const invoice = await page.getByRole("link", { name: /download invoice/i }).getAttribute("href");
    const pdf = await request.get(invoice!);
    // Backend: OrderViewSet.get_permissions only opens "retrieve" to guests,
    // so invoice-pdf answers 401 until that is fixed (reported). Either a PDF
    // or the handler's friendly 503 — never a raw backend error.
    if (pdf.status() === 200) expect(pdf.headers()["content-type"]).toContain("pdf");
    else expect(pdf.status()).toBe(503);
  });

  test("quote-only parts in the cart are moved to the quote list", async ({ page }) => {
    const part = await firstPart(page);
    test.skip(!part, "no parts");
    const slug = part!.split("/").pop()!;
    await page.evaluate((s) => {
      localStorage.setItem("re:cart:v1", JSON.stringify([{ productSlug: s, partNumber: "X", name: "Quote-only part", qty: 1, unitPrice: 100 }]));
      localStorage.removeItem("re:quote-list:v1");
    }, slug);
    await page.goto("/cart");
    const move = page.getByRole("button", { name: /move to quote list|move .* to the quote list/i }).first();
    await expect(move).toBeVisible();
    await move.click();
    await expect(page.getByText(/moved to your quote list/i)).toBeVisible();
    const list = await page.evaluate(() => localStorage.getItem("re:quote-list:v1"));
    expect(list).toContain(slug);
  });
});

test.describe("content", () => {
  test("contact form submits", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel(/your name/i).fill("E2E Contact");
    await page.getByLabel(/mobile number/i).fill("01711-000111");
    await page.getByLabel(/^email/i).fill("e2e@example.com");
    await page.getByRole("textbox", { name: /^message/i }).fill("Need 50 pcs DBx1 #14 needles, genuine only.");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByTestId("contact-sent")).toBeVisible();
  });

  test("policies: known slug renders, unknown is a real 404", async ({ page, request }) => {
    await page.goto("/policies/returns");
    await expect(page.locator("h1")).toContainText(/returns/i);
    expect((await request.get("/policies/not-a-policy")).status()).toBe(404);
    expect((await request.get("/guides/not-a-guide")).status()).toBe(404);
    expect((await request.get("/rfq/whatever")).status()).toBe(404);
    await page.setViewportSize({ width: 390, height: 900 });
    await shot(page, "policy-returns-390");
  });

  test("guides render with Article JSON-LD (en + bn)", async ({ page }) => {
    await page.goto("/guides");
    const links = page.locator('main a[href^="/guides/"]');
    expect(await links.count()).toBeGreaterThanOrEqual(3);
    await shot(page, "guides-1440");
    await page.goto("/guides/industrial-needle-systems-and-sizes");
    await expect(page.locator("h1")).toContainText("DBx1");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join("")).toContain('"Article"');
    await shot(page, "guide-needles-1440");
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/bn/guides/how-to-read-a-sewing-machine-part-number");
    await shot(page, "guide-partno-bn-390");
    await page.goto("/delivery");
    await shot(page, "delivery-390");
  });
});
