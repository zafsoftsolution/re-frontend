import { describe, expect, it } from "vitest";
import { absoluteUrl, breadcrumbList, itemList, productJsonLd, serializeJsonLd, SITE_URL } from "@/lib/seo/jsonld";
import { mapPartDetail, mapSpecifications } from "@/lib/api/mappers";

const RAW = {
  slug: "organ-db1-14",
  name: "Organ DB×1 #14 needle",
  sku: "RE-DBX1-14",
  part_number: "DBX1-14-ORG",
  alt_part_numbers: ["DB1-14"],
  category: { slug: "needles", name: "Needles", parent: null },
  brand: { slug: "organ", name: "Organ", is_oem: false, description: "", logo: "" },
  images: ["https://api.rakibenterprise-bd.com/media/p/needle.jpg"],
  short_description: "100 pcs",
  availability: "in_stock",
  currency: "BDT",
  machine_models: [{ slug: "juki-ddl-8700", name: "DDL-8700", machine_brand_slug: "juki", machine_brand_name: "Juki" }],
  specifications: { Size: "#14", Pack: 100, Empty: "" },
};

describe("productJsonLd", () => {
  it("quote part: mpn/sku/brand/image, and NO offers (no fake prices)", () => {
    const part = mapPartDetail({ ...RAW, price: null, sales_mode: "quote" })!;
    const ld = productJsonLd(part, { url: `${SITE_URL}/parts/organ-db1-14`, compatibleWith: ["Juki DDL-8700"] });
    expect(ld).toMatchObject({
      "@type": "Product",
      mpn: "DBX1-14-ORG",
      sku: "RE-DBX1-14",
      brand: { "@type": "Brand", name: "Organ" },
      image: ["https://api.rakibenterprise-bd.com/media/p/needle.jpg"],
      category: "Needles",
    });
    expect(ld).not.toHaveProperty("offers");
    expect(JSON.stringify(ld)).not.toMatch(/price/i);
  });

  it("a quote part never gets offers even if a price leaks into the payload", () => {
    const part = mapPartDetail({ ...RAW, price: "520.00", sales_mode: "quote" })!;
    expect(part.price).toBeNull();
    expect(productJsonLd(part, { url: "u" })).not.toHaveProperty("offers");
  });

  it("direct part: Offer in BDT with availability", () => {
    const part = mapPartDetail({ ...RAW, price: "520.00", sales_mode: "direct", availability: "low_stock" })!;
    expect(productJsonLd(part, { url: "https://x/parts/p" }).offers).toEqual({
      "@type": "Offer",
      url: "https://x/parts/p",
      price: "520.00",
      priceCurrency: "BDT",
      availability: "https://schema.org/LimitedAvailability",
      itemCondition: "https://schema.org/NewCondition",
    });
  });
});

describe("breadcrumbList / itemList", () => {
  it("numbers positions from 1", () => {
    const b = breadcrumbList([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Machines", url: `${SITE_URL}/machines` },
    ]);
    expect(b.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Machines", item: `${SITE_URL}/machines` },
    ]);
    const l = itemList([{ name: "A", url: "u1" }], "List");
    expect(l).toMatchObject({ "@type": "ItemList", name: "List", numberOfItems: 1 });
  });
});

describe("serializeJsonLd", () => {
  it("can't break out of the script element and stays valid JSON", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>", sep: "a b" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>", sep: "a b" });
  });
});

describe("absoluteUrl", () => {
  it("prefixes paths and leaves absolute URLs", () => {
    expect(absoluteUrl("/bn/parts/x")).toBe(`${SITE_URL}/bn/parts/x`);
    expect(absoluteUrl("https://cdn/x.jpg")).toBe("https://cdn/x.jpg");
  });
});

describe("mapPartDetail", () => {
  it("drops price tiers for quote parts and maps specs/models", () => {
    const part = mapPartDetail({ ...RAW, price: null, price_tiers: [{ min_quantity: 10, unit_price: "480" }] })!;
    expect(part.priceTiers).toEqual([]);
    expect(part.specifications).toEqual([
      ["Size", "#14"],
      ["Pack", "100"],
    ]);
    expect(part.machineModels[0]).toMatchObject({ slug: "juki-ddl-8700", brandSlug: "juki" });
    expect(part.fitsCount).toBe(1);
    expect(part.brandIsOem).toBe(false);
  });
  it("keeps sorted tiers for direct parts", () => {
    const part = mapPartDetail({
      ...RAW,
      price: "520",
      sales_mode: "direct",
      price_tiers: [
        { min_quantity: 50, unit_price: "440" },
        { min_quantity: 10, unit_price: "480" },
        { min_quantity: 0, unit_price: "1" },
      ],
    })!;
    expect(part.priceTiers).toEqual([
      { minQuantity: 10, unitPrice: 480 },
      { minQuantity: 50, unitPrice: 440 },
    ]);
  });
  it("accepts list-shaped specifications", () => {
    expect(mapSpecifications([{ label: "A", value: "1" }, { name: "B", value: 2 }, { key: "", value: "x" }])).toEqual([
      ["A", "1"],
      ["B", "2"],
    ]);
  });
});
