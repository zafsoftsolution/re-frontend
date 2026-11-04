import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { revalidateTag } from "next/cache";
import { checkContentLength, readBodyLimited, readJsonLimited } from "@/lib/forms/forward";
import { clampQty, parseQty, qtyDraft } from "@/lib/qty";
import { isDirect } from "@/lib/sales";
import { prerenderCatalog, topParams } from "@/lib/catalog/prerender";
import { isTransientApiError } from "@/lib/api/site";
import { ApiError } from "@/lib/api/client";
import { catalogLookup, markCatalogIndexStale, resetCatalogIndexStore } from "@/lib/api/catalog-index-store";
import { markRedirectsStale, redirectTable, resetRedirectStore } from "@/lib/api/redirect-store";
import { resolveLines } from "@/lib/forms/checkout";
import { checkoutItemsSchema } from "@/lib/forms/schemas";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("B1 — catalogue prerender gating", () => {
  it("prerenders real slugs only with PRERENDER_CATALOG=1", () => {
    expect(prerenderCatalog({})).toBe(false);
    expect(prerenderCatalog({ PRERENDER_CATALOG: "0" })).toBe(false);
    expect(prerenderCatalog({ PRERENDER_CATALOG: "1" })).toBe(true);
  });
  it("an empty index (prerender off) yields only the placeholder param", () => {
    expect(topParams([], 60, () => 0, (s: string) => ({ slug: s }), { slug: "__placeholder__" })).toEqual([{ slug: "__placeholder__" }]);
  });
  it("treats 429 / 5xx / network errors as transient, 4xx as final", () => {
    expect(isTransientApiError(new ApiError("x", 429))).toBe(true);
    expect(isTransientApiError(new ApiError("x", 503))).toBe(true);
    expect(isTransientApiError(new TypeError("fetch failed"))).toBe(true);
    expect(isTransientApiError(new ApiError("x", 403))).toBe(false);
  });
});

describe("H4 — quantities", () => {
  it("converts Bangla digits before stripping", () => {
    expect(parseQty("১২")).toBe(12);
    expect(parseQty("৫ pcs")).toBe(5);
    expect(parseQty("")).toBeNull();
    expect(parseQty("abc")).toBeNull();
    expect(clampQty("০", 1, 99)).toBe(1);
    expect(clampQty("২০০", 1, 99)).toBe(99);
    expect(clampQty("", 3, 99)).toBe(3);
    expect(qtyDraft("1a২3")).toBe("1২3");
  });
});

describe("sales-mode gating", () => {
  it("is direct only when the part is direct AND direct orders are on", () => {
    expect(isDirect({ salesMode: "direct", price: 100 }, true)).toBe(true);
    expect(isDirect({ salesMode: "direct", price: 100 }, false)).toBe(false);
    expect(isDirect({ salesMode: "direct", price: null }, true)).toBe(false);
    expect(isDirect({ salesMode: "quote", price: 100 }, true)).toBe(false);
  });
});

describe("request body limits", () => {
  const h = (v: Record<string, string>) => new Headers(v);
  it("checks Content-Length before parsing", () => {
    expect(checkContentLength(h({ "content-length": "100" }), 64)).toBe("too_large");
    expect(checkContentLength(h({ "content-length": "10" }), 64)).toBe("ok");
    expect(checkContentLength(h({}), 64)).toBe("ok");
    expect(checkContentLength(h({}), 64, { requireLength: true })).toBe("length_required");
    expect(checkContentLength(h({ "content-length": "abc" }), 64, { requireLength: true })).toBe("length_required");
  });
  it("aborts a streamed body without Content-Length once it exceeds the cap", async () => {
    const big = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 10; i++) c.enqueue(new Uint8Array(10_000));
        c.close();
      },
    });
    const req = new Request("http://x/api", { method: "POST", body: big, duplex: "half" } as RequestInit);
    expect(await readBodyLimited(req, 64 * 1024)).toBeNull();
    const small = new Request("http://x/api", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await readJsonLimited(small)).toEqual({ tooLarge: false, value: { a: 1 } });
  });
});

describe("checkout line lookups", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("resolves every slug in ONE call, as the visitor, without the internal secret", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "s3cret");
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      json({ count: 1, next: null, results: [{ id: "u1", slug: "a", name: "A", part_number: "PN-A", sales_mode: "direct", price: "120.00", available_qty: 4 }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const lines = await resolveLines(["a", "b", "a"], "en", { ip: "103.4.5.6" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const u = new URL(url);
    expect(u.pathname).toBe("/api/site/products/");
    expect(u.searchParams.get("slugs")).toBe("a,b");
    expect(u.searchParams.get("page_size")).toBe("100");
    const headers = init.headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("x-internal-secret");
    expect(headers["X-Forwarded-For"]).toBe("103.4.5.6");
    expect(lines.map((l) => [l.productSlug, l.found])).toEqual([["a", true], ["b", false]]);
    vi.unstubAllEnvs();
  });
  it("rejects malformed slugs in checkout items", () => {
    expect(checkoutItemsSchema.safeParse([{ productSlug: "../admin", qty: 1 }]).success).toBe(false);
    expect(checkoutItemsSchema.safeParse([{ productSlug: "juki-hook", qty: 1 }]).success).toBe(true);
  });
});

describe("proxy in-memory stores", () => {
  beforeEach(() => {
    resetCatalogIndexStore();
    resetRedirectStore();
  });
  afterEach(() => vi.unstubAllGlobals());

  const feed = (parts: string[]) => ({ products: parts.map((slug) => ({ slug })), machine_brands: [], machine_models: [], model_categories: [], categories: [], brands: [] });

  it("a refresh right after a revalidation reloads instead of returning the cached miss", async () => {
    let parts = ["a"];
    vi.stubGlobal("fetch", vi.fn(async () => json(feed(parts))));
    expect((await catalogLookup.index())?.parts).toEqual(["a"]);
    parts = ["a", "new-part"];
    // Within MIN_RELOAD_MS and not revalidated: the cached copy stands.
    expect((await catalogLookup.index({ refresh: true }))?.parts).toEqual(["a"]);
    markCatalogIndexStale();
    expect((await catalogLookup.index({ refresh: true }))?.parts).toEqual(["a", "new-part"]);
  });

  it("state is shared through globalThis", () => {
    const key = Symbol.for("rakib-enterprise.catalog-index-store");
    expect((globalThis as Record<symbol, unknown>)[key]).toBeTruthy();
  });

  it("a revalidated redirect table is reloaded on the next request", async () => {
    let rows = [{ from_path: "/old", to_path: "/new", status_code: 301 }];
    vi.stubGlobal("fetch", vi.fn(async () => json(rows)));
    const first = await redirectTable();
    rows = [...rows, { from_path: "/old2", to_path: "/new2", status_code: 301 }];
    expect(await redirectTable()).toBe(first);
    markRedirectsStale();
    const next = await redirectTable();
    expect(next).not.toBe(first);
  });
});

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.stubEnv("REVALIDATE_SECRET", "topsecret");
    vi.mocked(revalidateTag).mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  const post = async (body: unknown, secret = "topsecret") => {
    const { POST } = await import("@/app/api/revalidate/route");
    return POST(
      new Request("http://x/api/revalidate", {
        method: "POST",
        headers: { "x-revalidate-secret": secret, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  };

  it("accepts big tag lists (deduped, chunked) — no 400 at 100", async () => {
    const tags = [...Array.from({ length: 1500 }, (_, i) => `product:p-${i}`), "products", "products"];
    const res = await post({ tags });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { count: number }).count).toBe(1501);
    expect(revalidateTag).toHaveBeenCalledTimes(1501);
  });
  it("rejects bad secrets and over-cap lists", async () => {
    expect((await post({ tags: ["products"] }, "wrong")).status).toBe(401);
    expect((await post({ tags: Array.from({ length: 2001 }, (_, i) => `product:${i}`) })).status).toBe(413);
    expect((await post({ tags: [] })).status).toBe(400);
  });
});
