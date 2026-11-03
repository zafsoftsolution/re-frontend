import type { NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { isValidSlug } from "@/lib/api/catalog-index";
import { localePath } from "@/lib/seo/metadata";

/**
 * No-JS target of the "find by machine" form: /machines/find?brand=&model=
 * → 303 to the model page, the brand page, or back to /machines. The proxy
 * then validates the slugs (unknown → 404, model under the wrong brand →
 * its canonical URL), so nothing is fetched here.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/[locale]/machines/find">) {
  const { locale: raw } = await ctx.params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const sp = request.nextUrl.searchParams;
  const brand = sp.get("brand")?.trim() ?? "";
  const model = sp.get("model")?.trim() ?? "";
  let href = "/machines";
  if (brand && isValidSlug(brand)) {
    href = model && isValidSlug(model) ? `/machines/${brand}/${model}` : `/machines/${brand}`;
  }
  // Relative Location: correct behind the reverse proxy whatever Host it sends.
  return new Response(null, { status: 303, headers: { Location: localePath(href, locale), "Cache-Control": "no-store" } });
}
