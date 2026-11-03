import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { absoluteUrl } from "./jsonld";

/** Locale-prefixed path for a locale-less href ("/machines" → "/bn/machines"). */
export const localePath = (href: string, locale: Locale) => getPathname({ href, locale });

/** Absolute URL of a locale-less href in `locale`. */
export const localeUrl = (href: string, locale: Locale) => absoluteUrl(localePath(href, locale));

/**
 * Per-page metadata for catalogue routes: canonical + hreflang (en, bn,
 * x-default → en), Open Graph with the page image (falls back to the site
 * card), optional noindex. `title` goes through the layout's template
 * unless it came from an admin-written seo_title (used as-is).
 */
export function catalogMetadata({
  locale,
  href,
  title,
  seoTitle,
  description,
  image,
  noindex = false,
  siteName,
}: {
  locale: Locale;
  href: string;
  title: string;
  seoTitle?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  siteName: string;
}): Metadata {
  const canonical = localePath(href, locale);
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localePath(href, l);
  languages["x-default"] = localePath(href, routing.defaultLocale);
  const desc = description?.replace(/\s+/g, " ").trim().slice(0, 300) || undefined;
  const ogTitle = seoTitle || `${title} · ${siteName}`;
  return {
    title: seoTitle ? { absolute: seoTitle } : title,
    description: desc,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName,
      title: ogTitle,
      description: desc,
      url: canonical,
      locale: locale === "bn" ? "bn_BD" : "en_BD",
      alternateLocale: locale === "bn" ? ["en_BD"] : ["bn_BD"],
      images: image
        ? [{ url: absoluteUrl(image), alt: title }]
        : [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: desc },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
