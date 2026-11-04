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
 * answered with the prerendered /<locale>/404/not-found page ([locale]/[...rest])
 * and a real HTTP 404 — see notFound() below. (A rewrite's `status` option is
 * ignored for app pages, and notFound() there only streams an empty error
 * shell, so documents fetch the page and re-send it with 404.) Add a
 * section when you add its route.
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

  // The prerendered 404 page itself (also the target of the internal fetch below).
  if (prefixed && rest.length === 2 && rest[0] === "404" && rest[1] === "not-found") return NextResponse.next();

  const notFound = async () => {
    const target = `/${locale}/404/not-found`;
    // Client-side navigations want the RSC payload: plain rewrite.
    if (!request.headers.get("rsc")) {
      // Documents: a rewrite's status is ignored for app pages, and notFound()
      // streams an empty shell — so fetch the prerendered page and send its
      // HTML with a real 404.
      try {
        const port = process.env.PORT || request.nextUrl.port || "3000";
        const res = await fetch(`http://127.0.0.1:${port}${target}`, {
          headers: { accept: "text/html" },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          return new NextResponse(res.body, {
            status: 404,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
          });
        }
      } catch {
        /* fall back to the rewrite */
      }
    }
    const url = request.nextUrl.clone();
    url.pathname = target;
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
  //    (favicon.ico, icon.png, apple-icon.png) and public/opengraph-image.png
  // Keep in sync with tests/unit/proxy-matcher.test.ts.
  matcher: [
    "/((?!(?:admin|api|_next|_vercel)(?:/|$)|sitemap[^/]*\\.xml|robots\\.txt|llms\\.txt|.*\\..*).*)",
  ],
};
