import { Suspense } from "react";
import { resolveLocale } from "@/i18n/params";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { SearchInput } from "@/components/ui/Input";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SearchResultsView } from "@/components/search/SearchResults";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "search" });
  // Search URLs are never indexed (brief → SEO).
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations();
  const action = getPathname({ href: "/search", locale: locale });

  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("search.title") }]} />
      <SectionHeader as="h1" title={t("search.title")} className="mt-4" />
      {/* searchParams is request data → stream the results inside Suspense;
          the shell (header, form) stays in the static prerender. */}
      <Suspense
        fallback={
          <>
            <SearchInput
              action={action}
              label={t("header.searchLabel")}
              placeholder={t("header.searchPlaceholder")}
              submitLabel={t("header.searchSubmit")}
              size="lg"
              className="mt-6 max-w-3xl"
            />
            <div className="mt-8 h-40 animate-pulse bg-re-steel-50" />
          </>
        }
      >
        <SearchResultsView locale={locale} searchParams={searchParams} action={action} />
      </Suspense>
    </div>
  );
}
