import { describe, expect, it } from "vitest";
import { buildApiUrl, DEFAULT_API_ROOT, resolveApiRoot } from "@/lib/api/config";
import { serverHeaders, unwrapList } from "@/lib/api/client";
import { mapPart, mapSettings } from "@/lib/api/mappers";

describe("resolveApiRoot", () => {
  it("prefers INTERNAL_DJANGO_BACKEND on the server", () => {
    expect(
      resolveApiRoot(true, {
        INTERNAL_DJANGO_BACKEND: "http://backend:9086",
        NEXT_PUBLIC_DJANGO_BACKEND: "https://api.rakibenterprise-bd.com",
      }),
    ).toBe("http://backend:9086");
  });

  it("ignores INTERNAL_DJANGO_BACKEND in the browser", () => {
    expect(
      resolveApiRoot(false, { INTERNAL_DJANGO_BACKEND: "http://backend:9086", NEXT_PUBLIC_DJANGO_BACKEND: "https://x.test" }),
    ).toBe("https://x.test");
  });

  it("falls through empty strings (CI sets vars to '')", () => {
    expect(resolveApiRoot(true, { INTERNAL_DJANGO_BACKEND: "", NEXT_PUBLIC_DJANGO_BACKEND: "https://x.test" })).toBe(
      "https://x.test",
    );
    expect(resolveApiRoot(true, { INTERNAL_DJANGO_BACKEND: "  ", NEXT_PUBLIC_DJANGO_BACKEND: "" })).toBe(DEFAULT_API_ROOT);
    expect(resolveApiRoot(false, {})).toBe("https://api.rakibenterprise-bd.com");
  });

  it("strips trailing slashes", () => {
    expect(resolveApiRoot(true, { INTERNAL_DJANGO_BACKEND: "http://backend:9086//" })).toBe("http://backend:9086");
  });
});

describe("buildApiUrl", () => {
  it("joins root + /api + path and drops empty query values", () => {
    expect(buildApiUrl("https://a.test", "/site/products/", { q: "DB x1", page_size: 24, brand: "", x: undefined })).toBe(
      "https://a.test/api/site/products/?q=DB+x1&page_size=24",
    );
  });
  it("repeats array values and adds a leading slash", () => {
    expect(buildApiUrl("https://a.test", "site/x/", { tag: ["a", "b"] })).toBe("https://a.test/api/site/x/?tag=a&tag=b");
  });
});

describe("serverHeaders", () => {
  it("sends X-Internal-Secret only when configured", () => {
    expect(serverHeaders({ INTERNAL_API_SECRET: "s3cret" })).toEqual({ "X-Internal-Secret": "s3cret" });
    expect(serverHeaders({ INTERNAL_API_SECRET: "" })).toEqual({});
    expect(serverHeaders({})).toEqual({});
  });
});

describe("mappers", () => {
  it("unwraps DRF pages and plain arrays", () => {
    expect(unwrapList({ count: 1, next: null, previous: null, results: [1] })).toEqual([1]);
    expect(unwrapList([2])).toEqual([2]);
    expect(unwrapList(null)).toEqual([]);
  });

  it("keeps quote-only parts price-less even if a price leaks through", () => {
    const p = mapPart({ slug: "a", name: "Hook", price: "120.00", sales_mode: "quote", availability: "low_stock" });
    expect(p?.price).toBeNull();
    expect(p?.salesMode).toBe("quote");
    expect(p?.availability).toBe("low_stock");
  });

  it("maps direct parts with a price", () => {
    const p = mapPart({ slug: "b", name: "Needle", price: "45.5", compare_at_price: null, sales_mode: "direct" });
    expect(p).toMatchObject({ price: 45.5, compareAtPrice: null, salesMode: "direct" });
  });

  it("treats direct parts without a price as quote", () => {
    expect(mapPart({ slug: "c", name: "x", price: null, sales_mode: "direct" })?.salesMode).toBe("quote");
  });

  it("maps bootstrap settings with nested social", () => {
    const s = mapSettings({
      site_name: "RE",
      contact_phone: "01700",
      social: { facebook: "https://fb.test" },
      flat_shipping_fee: "60",
      direct_orders_enabled: true,
    });
    expect(s.social.facebook).toBe("https://fb.test");
    expect(s.shipping.flatFee).toBe(60);
    expect(s.directOrdersEnabled).toBe(true);
    expect(mapSettings(null).directOrdersEnabled).toBe(false);
  });
});
