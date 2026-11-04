import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Wrench } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap, getPartsBrands } from "@/lib/api/site";
import type { PartsBrandSummary } from "@/lib/api/types";
import { breadcrumbJsonLd, joinList } from "@/lib/catalog/page";
import { catalogMetadata, localeUrl } from "@/lib/seo/metadata";
import { itemList } from "@/lib/seo/jsonld";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { EmptyParts } from "@/components/catalog/EmptyParts";
import { JsonLd } from "@/components/catalog/JsonLd";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";

export async function generateMetadata({ params }: PageProps<"/[locale]/brands">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, brands, boot] = await Promise.all([getTranslations({ locale }), getPartsBrands(locale), getBootstrap(locale)]);
  return catalogMetadata({
    locale,
    href: "/brands",
    title: t("catalog.brands.title"),
    description: t("catalog.brands.metaDescription", { brands: joinList(brands.map((b) => b.name), locale, 8) }),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

export default async function BrandsPage({ params }: PageProps<"/[locale]/brands">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, brands, boot] = await Promise.all([getTranslations({ locale }), getPartsBrands(locale), getBootstrap(locale)]);
  const byName = (a: PartsBrandSummary, b: PartsBrandSummary) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const genuine = brands.filter((b) => b.isOem).sort(byName);
  const compatible = brands.filter((b) => !b.isOem).sort(byName);
  const crumbs = [{ label: t("nav.home"), href: "/" }, { label: t("catalog.brands.title") }];

  const group = (id: string, index: string, title: string, body: string, Icon: typeof BadgeCheck, list: PartsBrandSummary[], grade: "genuine" | "compatible") =>
    list.length > 0 && (
      <section aria-labelledby={id} className="mt-12">
        <SectionHeader
          id={id}
          index={index}
          title={
            <span className="inline-flex items-center gap-3">
              <Icon aria-hidden className="size-7 text-re-ink" strokeWidth={1.5} />
              {title}
            </span>
          }
          subtitle={body}
        />
        <ul className="mt-6 grid gap-px border border-re-steel-200 bg-re-steel-200 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.slug} className="bg-re-paper">
              <Link
                href={`/brands/${b.slug}`}
                className="group grid min-h-24 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 p-4 transition-colors duration-150 hover:bg-re-steel-50"
              >
                <CatalogImage src={b.logo} alt="" sizes="80px" className="aspect-[2/1] w-20 border border-re-steel-200 bg-re-paper" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[1.125rem] font-bold text-re-ink group-hover:text-re-red-text">{b.name}</span>
                    <Badge grade={grade} />
                  </span>
                  <span className="re-mono text-[0.8125rem] text-re-steel-600">{t("catalog.brands.count", { count: b.productCount })}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 text-re-steel-400 group-hover:text-re-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, "/brands"),
          itemList(
            [...genuine, ...compatible].map((b) => ({ name: b.name, url: localeUrl(`/brands/${b.slug}`, locale) })),
            t("catalog.brands.title"),
          ),
        ]}
      />
      <SheetHeader crumbs={crumbs} eyebrow={t("catalog.brands.eyebrow")} title={t("catalog.brands.title")} lead={t("catalog.brands.lead")} />
      <div className="re-shell">
        {brands.length === 0 && (
          <div className="mt-10">
            <EmptyParts
              whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone}
              context={t("catalog.brands.title")}
              title={t("catalog.brands.empty")}
            />
          </div>
        )}
        {group("genuine", "01", t("catalog.brands.genuineTitle"), t("catalog.brands.genuineBody"), BadgeCheck, genuine, "genuine")}
        {group("compatible", genuine.length ? "02" : "01", t("catalog.brands.compatibleTitle"), t("catalog.brands.compatibleBody"), Wrench, compatible, "compatible")}
      </div>
    </>
  );
}
