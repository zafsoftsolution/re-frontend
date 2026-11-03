import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/**
 * Top-level public sections (see docs/REBUILD_BRIEF.md → IA). Anything else is
 * rewritten to a two-segment path that only [locale]/[...rest] matches; that
 * page throws notFound() before anything streams, so the response is a real
 * HTTP 404 inside the localized shell. (A notFound() after awaiting params in
 * a partially-prerendered page can only send 200 + noindex, and a rewrite's
 * `status` option is ignored for app pages.) Add a section when you add its route.
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
  "account",
  "login",
  "register",
  "about",
  "contact",
  "delivery",
  "guides",
  "policies",
]);

export default function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const prefixed = (routing.locales as readonly string[]).includes(segments[0] ?? "");
  const section = (prefixed ? segments[1] : segments[0]) ?? "";

  if (!SECTIONS.has(section)) {
    const locale = prefixed ? segments[0] : routing.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/404/not-found`;
    return NextResponse.rewrite(url);
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
