import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { guardCatalogPath } from "./lib/api/catalog-index";
import { catalogLookup } from "./lib/api/catalog-index-store";
import { redirectTable } from "./lib/api/redirect-store";
import { legacyRedirect, redirectUrl, resolveRedirect } from "./lib/redirects";
import { SUBPATHS } from "./content/slugs";

const handleI18nRouting = createMiddleware(routing);

/**
 * Top-level public sections (see docs/REBUILD_BRIEF.md → IA). Anything else is
 * rewritten to a two-segment path that only [locale]/[...rest] matches; that
 * page throws notFound() before anything streams, so the response is a real
 * HTTP 404 inside the localized shell. (A notFound() after awaiting params in
 * a partially-prerendered page can only send 200 + noindex, and a rewrite's
 * `status` option is ignored for app pages.) Add a section when you add its route.
 *
 * Catalogue detail paths (/machines/…, /parts/…, /categories/…, /brands/…)
 * are validated the same way against a cached slug index — see
 * src/lib/api/catalog-index.ts — so unknown slugs are real 404s too.
 */
const SECTIONS = new Set([
  "",
  "machines",
  "parts",
  "categories",
  "brands",
  "search",
  "rfq",
  "cart",
  "checkout",
  "about",
  "contact",
  "delivery",
  "guides",
  "policies",
]);

const CATALOG = new Set(["machines", "parts", "categories", "brands"]);

export default async function proxy(request: NextRequest) {
  // 1. Admin-managed redirects (in-memory copy; none while the backend is
  //    unreachable), then the old storefront's URLs. Query strings are kept.
  const { pathname } = request.nextUrl;
  const redirect =
    resolveRedirect(await redirectTable(), pathname) ?? legacyRedirect(pathname, routing.locales);
  if (redirect) return NextResponse.redirect(redirectUrl(redirect, request.url), redirect.status);

  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const prefixed = (routing.locales as readonly string[]).includes(segments[0] ?? "");
  const rest = prefixed ? segments.slice(1) : segments;
  const section = rest[0] ?? "";
  const locale = prefixed ? segments[0] : routing.defaultLocale;

  const notFound = () => {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/404/not-found`;
    return NextResponse.rewrite(url);
  };

  if (!SECTIONS.has(section)) return notFound();

  // Conversion + content sections: only their known sub-pages exist
  // (/rfq/sent, /policies/returns, /guides/<slug>, …).
  const allowed = SUBPATHS[section];
  if (allowed && rest.length > 1 && (rest.length > 2 || !allowed.includes(rest[1]))) return notFound();

  if (CATALOG.has(section) && (rest.length > 1 || section === "parts")) {
    const verdict = await guardCatalogPath(rest, catalogLookup);
    if (verdict.kind === "not-found") return notFound();
    if (verdict.kind === "redirect") {
      const target = new URL(`${prefixed ? `/${locale}` : ""}${verdict.path}`, request.url);
      return NextResponse.redirect(target, verdict.permanent ? 308 : 307);
    }
  }
  return handleI18nRouting(request);
}

export const config = {
  // Run only on public-site pages. Excluded:
  //  - /admin (own root layout, not localised), /api, /_next, /_vercel
  //  - sitemap*.xml, robots.txt, llms.txt
  //  - anything with a file extension: public/ assets and the metadata files
  //    (favicon.ico, icon.png, apple-icon.png, opengraph-image.png)
  // Keep in sync with tests/unit/proxy-matcher.test.ts.
  matcher: [
    "/((?!(?:admin|api|_next|_vercel)(?:/|$)|sitemap[^/]*\\.xml|robots\\.txt|llms\\.txt|.*\\..*).*)",
  ],
};
