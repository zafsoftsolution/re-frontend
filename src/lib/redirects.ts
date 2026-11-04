/**
 * Redirect rules applied by src/proxy.ts before routing. Pure (no Next
 * imports) so they are unit-tested.
 *
 *  1. Admin-managed redirects (GET /api/site/redirects/), cached in memory by
 *     src/lib/api/redirect-store.ts. Matched like Django's RedirectMiddleware:
 *     case-insensitive, trailing slash ignored. Chains are followed (≤ 5
 *     hops) and loops are dropped.
 *  2. Permanent redirects from the old fashion storefront's URLs that may
 *     still be indexed or bookmarked (/products/<slug>, /collections/…).
 */
import type { SiteRedirect } from "@/lib/api/types";

type Raw = Record<string, unknown>;

/** GET /api/site/redirects/ rows → SiteRedirect (bad rows dropped). */
export function parseRedirects(data: unknown): SiteRedirect[] {
  const list = Array.isArray(data) ? data : ((data as Raw | null)?.results ?? []);
  return (Array.isArray(list) ? list : []).flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const o = r as Raw;
    const fromPath = typeof o.from_path === "string" ? o.from_path.trim() : "";
    const toPath = typeof o.to_path === "string" ? o.to_path.trim() : "";
    const code = Number(o.status_code);
    if (!fromPath.startsWith("/") || !toPath) return [];
    return [{ fromPath, toPath, statusCode: ([301, 302, 307, 308].includes(code) ? code : 301) as SiteRedirect["statusCode"] }];
  });
}

export interface RedirectTarget {
  /** Relative path (may carry its own ?query / #hash) or an absolute URL. */
  location: string;
  status: 301 | 302 | 307 | 308;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** "/Mens-Shirts/" → "/mens-shirts"; percent-encoding and case ignored. */
export function normalizeRedirectPath(path: string): string {
  const bare = path.split(/[?#]/)[0] ?? "";
  const decoded = safeDecode(bare).toLowerCase().replace(/\/{2,}/g, "/");
  const trimmed = decoded.length > 1 ? decoded.replace(/\/+$/, "") : decoded;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

const isAbsolute = (v: string) => /^https?:\/\//i.test(v);

export type RedirectTable = Map<string, SiteRedirect>;

export function buildRedirectTable(rules: SiteRedirect[]): RedirectTable {
  const table: RedirectTable = new Map();
  for (const r of rules) {
    if (!r.fromPath.startsWith("/") || !r.toPath) continue;
    const key = normalizeRedirectPath(r.fromPath);
    // A rule pointing at itself would loop forever.
    if (!isAbsolute(r.toPath) && normalizeRedirectPath(r.toPath) === key) continue;
    if (!table.has(key)) table.set(key, r);
  }
  return table;
}

const MAX_HOPS = 5;

/**
 * Final target for `pathname`, following chains (A → B → C sends A straight
 * to C). Any temporary hop makes the result temporary. A chain that loops
 * back on itself (or runs past MAX_HOPS) yields null — serve the page
 * instead of a redirect loop.
 */
export function resolveRedirect(table: RedirectTable, pathname: string): RedirectTarget | null {
  if (table.size === 0) return null;
  const start = normalizeRedirectPath(pathname);
  let rule = table.get(start);
  if (!rule) return null;
  const seen = new Set([start]);
  let permanent = rule.statusCode === 301 || rule.statusCode === 308;
  let status = rule.statusCode;
  for (let hop = 1; ; hop++) {
    if (isAbsolute(rule.toPath)) break;
    const next = normalizeRedirectPath(rule.toPath);
    if (seen.has(next)) return null;
    const nextRule = table.get(next);
    if (!nextRule) break;
    if (hop >= MAX_HOPS) return null;
    seen.add(next);
    if (!(nextRule.statusCode === 301 || nextRule.statusCode === 308)) {
      permanent = false;
      status = nextRule.statusCode;
    }
    rule = nextRule;
  }
  if (!permanent && (status === 301 || status === 308)) status = 302;
  const location = isAbsolute(rule.toPath) || rule.toPath.startsWith("/") ? rule.toPath : `/${rule.toPath}`;
  return { location, status };
}

/**
 * Old storefront URLs → their closest page here. `pathname` is the raw
 * request path; an optional locale prefix (e.g. "/bn") is kept.
 */
export function legacyRedirect(pathname: string, locales: readonly string[]): RedirectTarget | null {
  const segments = pathname.split("/").filter(Boolean);
  const prefixed = locales.includes(segments[0] ?? "");
  const prefix = prefixed ? `/${segments[0]}` : "";
  const [section, slug, ...rest] = prefixed ? segments.slice(1) : segments;
  const to = (path: string): RedirectTarget => ({ location: path === "/" ? prefix || "/" : `${prefix}${path}`, status: 308 });
  switch (section) {
    case "products":
    case "product":
      return slug && rest.length === 0 ? to(`/parts/${slug}`) : to("/categories");
    case "shop":
      return to("/categories");
    case "collections":
    case "lookbook":
      return to("/");
    case "wishlist":
      return to("/rfq");
    case "account":
    case "login":
    case "register":
      return to("/");
    case "faq":
      return to("/contact");
    case "privacy":
    case "terms":
      return slug ? null : to(`/policies/${section}`);
    default:
      return null;
  }
}

/**
 * Absolute redirect URL: relative targets resolve against the request, and
 * the request's query string is kept (target's own params win).
 */
export function redirectUrl(target: RedirectTarget, requestUrl: string): URL {
  const req = new URL(requestUrl);
  const url = new URL(target.location, req);
  for (const [k, v] of req.searchParams) if (!url.searchParams.has(k)) url.searchParams.append(k, v);
  return url;
}
