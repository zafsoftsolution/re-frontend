import { describe, expect, it } from "vitest";
import {
  formatMoney,
  isValidBdPhone,
  toMoneyString,
  toNumber,
  waDigits,
  whatsappLink,
} from "@/lib/admin/quotes";
import { effectiveSalesMode } from "@/lib/admin/sales-mode";
import { HOME_SECTIONS, sectionOf } from "@/lib/admin/home-sections";
import { validateTiers } from "@/components/admin/products/PriceTiersEditor";

describe("quote helpers", () => {
  it("normalises Bangladeshi numbers for wa.me", () => {
    expect(waDigits("01711-000 000")).toBe("8801711000000");
    expect(waDigits("+880 1711 000000")).toBe("8801711000000");
    expect(waDigits("1711000000")).toBe("8801711000000");
    expect(whatsappLink("01711000000", "hi there")).toBe("https://wa.me/8801711000000?text=hi%20there");
    expect(whatsappLink("123")).toBeNull();
  });

  it("validates BD mobiles", () => {
    expect(isValidBdPhone("+8801711000000")).toBe(true);
    expect(isValidBdPhone("01911-000000")).toBe(true);
    expect(isValidBdPhone("01211000000")).toBe(false); // no 012 operator
    expect(isValidBdPhone("+44 7700 900000")).toBe(false);
  });

  it("parses and formats decimal strings", () => {
    expect(toNumber("12.50")).toBe(12.5);
    expect(toNumber("")).toBeNull();
    expect(toNumber("abc")).toBeNull();
    expect(toMoneyString(10 / 3)).toBe("3.33");
    expect(formatMoney("1234.5")).toBe("৳ 1,234.50");
    expect(formatMoney(null)).toBe("—");
  });
});

describe("effectiveSalesMode", () => {
  it("is direct only for mixed site + direct product without price-on-request", () => {
    expect(effectiveSalesMode("mixed", "direct", false)).toBe("direct");
    expect(effectiveSalesMode("mixed", "direct", true)).toBe("quote");
    expect(effectiveSalesMode("mixed", "inherit", false)).toBe("quote");
    expect(effectiveSalesMode("quote_only", "direct", false)).toBe("quote");
  });
});

describe("validateTiers", () => {
  it("accepts ascending unique tiers", () => {
    const r = validateTiers(
      [{ min_quantity: "10", unit_price: "90" }, { min_quantity: "50", unit_price: "80" }],
      1,
    );
    expect(r.errors).toEqual({});
    expect(r.warnings).toEqual([]);
  });
  it("flags duplicates, non-ascending rows and bad numbers", () => {
    const r = validateTiers(
      [
        { min_quantity: "10", unit_price: "90" },
        { min_quantity: "10", unit_price: "80" },
        { min_quantity: "5", unit_price: "70" },
        { min_quantity: "0", unit_price: "1" },
        { min_quantity: "100", unit_price: "" },
      ],
      1,
    );
    expect(Object.keys(r.errors).map(Number)).toEqual([1, 2, 3, 4]);
  });
  it("warns when price does not drop or tier is below MOQ", () => {
    const r = validateTiers([{ min_quantity: "5", unit_price: "90" }, { min_quantity: "20", unit_price: "95" }], 10);
    expect(r.errors).toEqual({});
    expect(r.warnings.length).toBe(2);
  });
});

describe("home sections", () => {
  it("maps blocks to sections by kind + metadata marker", () => {
    expect(sectionOf({ kind: "hero", metadata: {} })?.key).toBe("hero");
    expect(sectionOf({ kind: "marquee", metadata: {} })?.key).toBe("announcement");
    expect(sectionOf({ kind: "custom", metadata: { section: "rfq_band" } })?.key).toBe("rfq_band");
    expect(sectionOf({ kind: "custom", metadata: {} })).toBeNull();
    expect(sectionOf({ kind: "manifesto", metadata: {} })).toBeNull();
  });
  it("only uses kinds the backend supports", () => {
    const supported = ["hero", "marquee", "category_grid", "featured_edit", "manifesto", "new_arrivals", "lookbook_feature", "best_sellers", "testimonials", "newsletter_cta", "custom"];
    for (const s of HOME_SECTIONS) expect(supported).toContain(s.kind);
  });
});
