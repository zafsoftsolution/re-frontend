import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Admin console e2e — needs a backend with demo data and a staff account:
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… BASE_URL=http://127.0.0.1:3200 npx playwright test admin
 * Quotes must already exist (create a few via POST /api/site/rfq/). The
 * specs restore what they change (sales modes) so they can be re-run.
 */
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const SHOTS = process.env.ADMIN_SCREENSHOT_DIR;

test.skip(!EMAIL || !PASSWORD, "ADMIN_EMAIL / ADMIN_PASSWORD not set");
test.describe.configure({ mode: "serial" });

const API = process.env.ADMIN_API_URL || "http://127.0.0.1:8001/api";
let session: { access: string; refresh: string; user: unknown } | null = null;

async function uiLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Sign in once via the API (login is throttled to 10/min) and seed the
 *  admin's localStorage session before the app boots. */
async function login(page: Page) {
  if (!session) {
    const res = await page.request.post(`${API}/auth/login/`, { data: { email: EMAIL, password: PASSWORD } });
    expect(res.ok()).toBeTruthy();
    session = await res.json();
  }
  await page.addInitScript((s) => {
    localStorage.setItem("jmn:admin:access", s.access);
    localStorage.setItem("jmn:admin:refresh", s.refresh);
    localStorage.setItem("jmn:admin:user", JSON.stringify(s.user));
  }, session!);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function confirmDialog(page: Page, label: string | RegExp) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: label }).click();
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

test("unauthenticated admin routes redirect to login", async ({ page }) => {
  await page.goto("/admin/rfq");
  await expect(page).toHaveURL(/\/admin\/login$/);
  // Admin pages are never indexable.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("login lands on the dashboard with quote KPIs", async ({ page }) => {
  await uiLogin(page);
  const panel = page.getByRole("region", { name: "Quotes" }).or(page.locator("section[aria-labelledby=dash-quotes]"));
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Awaiting quote")).toBeVisible();
  await expect(panel.getByText("Conversion rate")).toBeVisible();
  await expect(page.getByRole("list", { name: "Newest quote requests" }).getByRole("link").first()).toBeVisible();
  await shot(page, "dashboard");
});

test("quotes inbox: list, search and detail", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /^Quotes/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/rfq$/);
  await expect(page.getByRole("tab", { name: /New/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /^All/ }).click();
  await page.getByRole("searchbox", { name: "Search quotes" }).fill("Gazipur");
  const table = page.getByTestId("quotes-table");
  await expect(table.getByRole("row")).toHaveCount(2); // header + 1
  await shot(page, "quotes-list");
  await table.getByRole("link", { name: /RFQ-/ }).first().click();
  await expect(page.getByTestId("quote-reference")).toHaveText(/RFQ-\d{4}-\d+/);
  await expect(page.getByRole("link", { name: "01711000001" })).toHaveAttribute("href", "tel:01711000001");
  await expect(page.getByRole("link", { name: "WhatsApp" }).first()).toHaveAttribute("href", /wa\.me\/8801711000001/);
});

test("mark quoted prices the lines and flips the status", async ({ page }) => {
  await login(page);
  await page.goto("/admin/rfq?search=Gazipur&status=all");
  await page.getByTestId("quotes-table").getByRole("link", { name: /RFQ-/ }).first().click();
  const prices = page.getByTestId("line-price");
  await expect(prices.first()).toBeVisible();
  const n = await prices.count();
  for (let i = 0; i < n; i++) await prices.nth(i).fill(String(100 * (i + 1)));
  await expect(page.getByTestId("lines-sum")).not.toHaveText("৳ 0.00");
  await page.getByTestId("mark-quoted").click();
  await expect(page.locator("[data-status]").first()).toHaveAttribute("data-status", "quoted");
  await expect(page.getByRole("button", { name: /Send quote/ })).toBeVisible();
  await shot(page, "quote-detail");
});

test("product form saves the new part fields", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products");
  const firstEdit = page.getByTestId("products-table").getByRole("link", { name: /^Edit / }).first();
  await firstEdit.click();
  const form = page.getByTestId("product-form");
  await expect(form).toBeVisible();
  const alt = `E2E-${Date.now().toString().slice(-6)}`;
  await page.getByLabel("Add alternate part number").fill(alt);
  await page.getByLabel("Add alternate part number").press("Enter");
  await form.locator('input[name="min_order_quantity"]').fill("5");
  await form.locator('input[name="lead_time_days"]').fill("12");
  await form.locator('select[name="availability_override"]').selectOption("on_request");
  await form.getByRole("radiogroup", { name: "Sales mode" }).getByText("Quote only").click();
  await shot(page, "product-form");
  const url = page.url();
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.goto(url);
  await expect(page.getByText(alt)).toBeVisible();
  await expect(page.locator('input[name="min_order_quantity"]')).toHaveValue("5");
  await expect(page.locator('input[name="lead_time_days"]')).toHaveValue("12");
  await expect(page.locator('select[name="availability_override"]')).toHaveValue("on_request");
  await expect(page.locator('input[name="sales_mode"][value="quote_only"]')).toBeChecked();
  // Restore
  await page.locator('select[name="availability_override"]').selectOption("auto");
  await page.getByRole("radiogroup", { name: "Sales mode" }).getByText("Inherit").click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
});

test("bulk action sets sales mode on selected parts", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products");
  const rows = page.getByTestId("row-select");
  await rows.nth(0).check();
  await rows.nth(1).check();
  const bar = page.getByTestId("bulk-bar");
  await expect(bar).toContainText("2 selected");
  await shot(page, "products-bulk");
  await page.getByTestId("bulk-sales-mode").selectOption("quote_only");
  await confirmDialog(page, "Apply");
  await expect(page.getByText(/Updated \d+ part|already set/).first()).toBeVisible();
  await expect(bar).toBeHidden();
  // Restore to inherit
  await rows.nth(0).check();
  await rows.nth(1).check();
  await page.getByTestId("bulk-sales-mode").selectOption("inherit");
  await confirmDialog(page, "Apply");
  await expect(bar).toBeHidden();
});

test("import page validates a file with a dry run", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products/import");
  await page.getByTestId("import-file").setInputFiles({
    name: "parts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("sku,name,category,price\nE2E-NEW-1,Test hook,,100\n,No sku,hooks,5\n"),
  });
  await page.getByTestId("import-dry-run").click();
  await expect(page.getByTestId("import-report")).toBeVisible();
  await expect(page.getByTestId("import-errors")).toBeVisible();
  await shot(page, "import");
});

test("settings: sales mode switch asks for confirmation and saves", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");
  await page.getByTestId("sales-mode-mixed").click();
  await expect(page.getByRole("status")).toContainText("public");
  await page.getByRole("button", { name: "Save changes" }).click();
  await confirmDialog(page, "Switch to Mixed");
  await expect(page.getByText("Settings saved").first()).toBeVisible();
  await shot(page, "settings");
  // Restore quote-only.
  await page.getByTestId("sales-mode-quote_only").click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await confirmDialog(page, "Switch to Quote only");
  await expect(page.getByText("Settings saved").first()).toBeVisible();
});
