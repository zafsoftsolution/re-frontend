import { describe, expect, it } from "vitest";
import {
  buildRedirectTable,
  legacyRedirect,
  normalizeRedirectPath,
  parseRedirects,
  redirectUrl,
  resolveRedirect,
} from "@/lib/redirects";

const LOCALES = ["en", "bn"] as const;
const table = (rows: [string, string, number][]) =>
  buildRedirectTable(parseRedirects(rows.map(([from_path, to_path, status_code]) => ({ from_path, to_path, status_code }))));

describe("parseRedirects", () => {
  it("keeps valid rows, defaults odd status codes to 301", () => {
    expect(
      parseRedirects([
        { from_path: "/a", to_path: "/b", status_code: 302 },
        { from_path: "/c", to_path: "/d", status_code: 418 },
        { from_path: "no-slash", to_path: "/x", status_code: 301 },
        { from_path: "/e", to_path: "", status_code: 301 },
        null,
      ]),
    ).toEqual([
      { fromPath: "/a", toPath: "/b", statusCode: 302 },
      { fromPath: "/c", toPath: "/d", statusCode: 301 },
    ]);
    expect(parseRedirects({ results: [{ from_path: "/a", to_path: "/b", status_code: 308 }] })).toHaveLength(1);
    expect(parseRedirects(null)).toEqual([]);
  });
});

describe("backend redirects", () => {
  it("matches like Django's middleware: case and trailing slash ignored", () => {
    expect(normalizeRedirectPath("/Mens-Shirts/")).toBe("/mens-shirts");
    expect(normalizeRedirectPath("/")).toBe("/");
    const t = table([["/Old-Page/", "/about", 301]]);
    expect(resolveRedirect(t, "/old-page")).toEqual({ location: "/about", status: 301 });
    expect(resolveRedirect(t, "/OLD-PAGE/")).toEqual({ location: "/about", status: 301 });
    expect(resolveRedirect(t, "/other")).toBeNull();
  });

  it("uses each rule's status (301/302/307/308)", () => {
    const t = table([
      ["/a", "/x", 302],
      ["/b", "/x", 307],
      ["/c", "/x", 308],
    ]);
    expect(resolveRedirect(t, "/a")?.status).toBe(302);
    expect(resolveRedirect(t, "/b")?.status).toBe(307);
    expect(resolveRedirect(t, "/c")?.status).toBe(308);
  });

  it("collapses chains and drops loops", () => {
    const chain = table([
      ["/a", "/b", 301],
      ["/b", "/c", 301],
    ]);
    expect(resolveRedirect(chain, "/a")).toEqual({ location: "/c", status: 301 });
    const temp = table([
      ["/a", "/b", 301],
      ["/b", "/c", 302],
    ]);
    expect(resolveRedirect(temp, "/a")?.status).toBe(302);
    const loop = table([
      ["/a", "/b", 301],
      ["/b", "/a", 301],
    ]);
    expect(resolveRedirect(loop, "/a")).toBeNull();
    expect(resolveRedirect(table([["/self", "/Self/", 301]]), "/self")).toBeNull();
  });

  it("allows absolute targets and keeps the request query", () => {
    const t = table([["/promo", "https://example.com/x?a=1", 302]]);
    const r = resolveRedirect(t, "/promo")!;
    expect(redirectUrl(r, "http://localhost:3000/promo?a=2&utm=x").toString()).toBe("https://example.com/x?a=1&utm=x");
    expect(redirectUrl({ location: "/parts/x", status: 308 }, "http://h/products/x?ref=1").toString()).toBe("http://h/parts/x?ref=1");
  });
});

describe("legacy storefront URLs", () => {
  it.each([
    ["/products/juki-hook", "/parts/juki-hook"],
    ["/bn/products/juki-hook", "/bn/parts/juki-hook"],
    ["/products", "/categories"],
    ["/products/a/b", "/categories"],
    ["/shop", "/categories"],
    ["/collections", "/"],
    ["/collections/summer-2024", "/"],
    ["/bn/collections/x", "/bn"],
    ["/lookbook/a", "/"],
    ["/wishlist", "/rfq"],
    ["/bn/wishlist", "/bn/rfq"],
    ["/account", "/"],
    ["/account/orders", "/"],
    ["/login", "/"],
    ["/register", "/"],
    ["/faq", "/contact"],
    ["/privacy", "/policies/privacy"],
    ["/terms", "/policies/terms"],
  ])("%s -> %s (308)", (from, to) => {
    expect(legacyRedirect(from, LOCALES)).toEqual({ location: to, status: 308 });
  });

  it.each(["/", "/parts/x", "/categories", "/bn", "/machines/juki", "/policies/privacy"])("leaves %s alone", (p) => {
    expect(legacyRedirect(p, LOCALES)).toBeNull();
  });
});
