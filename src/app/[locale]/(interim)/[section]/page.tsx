import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/params";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SearchInput } from "@/components/ui/Input";

/**
 * Phase 0 placeholder for nav targets that Phase 2 builds as real routes.
 * Static routes (e.g. app/[locale]/machines/page.tsx) take precedence over
 * this dynamic segment, so each one replaces its placeholder automatically.
 * Delete this folder once all sections exist.
 */
const SECTIONS = ["machines", "categories", "brands", "guides", "contact"] as const;
type Section = (typeof SECTIONS)[number];
const isSection = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SECTIONS.map((section) => ({ locale, section })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[section]">): Promise<Metadata> {
  const { section } = await params;
  const locale = await resolveLocale(params);
  if (!isSection(section)) return {};
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t(section), robots: { index: false, follow: true } };
}

export default async function InterimSection({ params }: PageProps<"/[locale]/[section]">) {
  const { section } = await params;
  const locale = await resolveLocale(params);
  if (!isSection(section)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t(`nav.${section}`) }]} />
      <SectionHeader as="h1" title={t(`nav.${section}`)} subtitle={t("placeholder.body")} className="mt-4" />
      <SearchInput
        action={getPathname({ href: "/search", locale: locale })}
        label={t("header.searchLabel")}
        placeholder={t("header.searchPlaceholder")}
        submitLabel={t("header.searchSubmit")}
        size="lg"
        className="mt-8 max-w-2xl"
      />
    </div>
  );
}
