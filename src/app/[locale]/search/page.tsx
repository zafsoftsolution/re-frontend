import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { getPathname } from "@/i18n/navigation";
import { SearchInput } from "@/components/ui/Input";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SearchResultsView } from "@/components/search/SearchResults";

type Props = PageProps<"/[locale]/search">;

/**
 * searchParams → rendered per request (data is 'use cache'd in searchParts).
 * Deliberately no <Suspense>: streamed-in results stay hidden without JS,
 * and search must work on the plainest phone browser.
 */
export const instant = false;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, sp] = await Promise.all([getTranslations({ locale, namespace: "search" }), searchParams]);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80);
  // Search URLs are never indexed (brief → SEO).
  return { title: q ? t("titleFor", { query: q }) : t("title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, sp] = await Promise.all([getTranslations({ locale }), searchParams]);
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().slice(0, 120);

  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("search.title") }]} />
      <SectionHeader as="h1" title={t("search.title")} className="mt-4" />
      <SearchInput
        action={getPathname({ href: "/search", locale })}
        label={t("header.searchLabel")}
        placeholder={t("header.searchPlaceholder")}
        submitLabel={t("header.searchSubmit")}
        defaultValue={q}
        size="lg"
        className="mt-6 max-w-3xl"
      />
      <SearchResultsView locale={locale} query={q} />
    </div>
  );
}
