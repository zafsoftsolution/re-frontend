/**
 * Small helpers shared by the catalogue route files.
 */
import { getMessages } from "next-intl/server";
import type { Crumb } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { PLACEHOLDER_SLUG } from "@/lib/api/catalog-index";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { localeUrl } from "@/lib/seo/metadata";

/** How many of each entity to prerender at build time (rest: on demand). */
export const PRERENDER = { machineBrands: 12, modelsPerBrand: 8, categoriesPerModel: 4, parts: 60, categories: 24, brands: 12 } as const;

/** Top `n` by `score`, but never empty — Cache Components needs ≥ 1 param. */
export function topParams<T, P extends Record<string, string>>(
  items: T[],
  n: number,
  score: (x: T) => number,
  toParams: (x: T) => P,
  placeholder: P,
): P[] {
  const out = [...items].sort((a, b) => score(b) - score(a)).slice(0, n).map(toParams);
  return out.length ? out : [placeholder];
}

export const placeholder = PLACEHOLDER_SLUG;

/** BreadcrumbList JSON-LD from the visible trail (`href` locale-less).
 *  The last crumb is the current page: `currentHref`. */
export function breadcrumbJsonLd(crumbs: Crumb[], locale: Locale, currentHref: string) {
  return breadcrumbList(
    crumbs.map((c, i) => ({
      name: c.label,
      url: localeUrl(i === crumbs.length - 1 ? currentHref : (c.href ?? currentHref), locale),
    })),
  );
}

/** catalog.machineType messages for `locale` (value → label). */
export async function machineTypeLabels(locale: Locale): Promise<Record<string, string>> {
  const messages = await getMessages({ locale });
  return messages.catalog.machineType as Record<string, string>;
}

/** Localized machine-type label (`labels` from machineTypeLabels());
 *  falls back to the backend's English label for unknown types. */
export function machineTypeLabel(labels: Record<string, string>, type: string, fallback: string): string {
  return (type && labels[type]) || fallback || type;
}

/** Human list: "A, B and C" — English; Bangla uses "ও". */
export function joinList(items: string[], locale: Locale, max = 4): string {
  const list = items.filter(Boolean).slice(0, max);
  if (list.length <= 1) return list[0] ?? "";
  const and = locale === "bn" ? " ও " : " and ";
  return `${list.slice(0, -1).join(", ")}${and}${list[list.length - 1]}`;
}

export const LOCALES = routing.locales;
