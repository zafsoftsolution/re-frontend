import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllParts, getBootstrap, getMachineBrands, getMachineModels, getPartsBrand } from "@/lib/api/site";
import type { PartsBrandDetail } from "@/lib/api/types";
import { hasActiveFilters, parseListingParams, type SearchParamsRecord } from "@/lib/catalog/listing";
import { breadcrumbJsonLd, placeholder, PRERENDER, topParams, prerenderIndex } from "@/lib/catalog/page";
import { catalogMetadata } from "@/lib/seo/metadata";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { JsonLd } from "@/components/catalog/JsonLd";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { ListingView } from "@/components/catalog/ListingView";
import { Badge } from "@/components/ui/Badge";

type Props = PageProps<"/[locale]/brands/[slug]">;

/**
 * Params not in generateStaticParams render on first request (blocking —
 * no generic App Shell: params are validated before anything streams) and
 * are then cached. Unknown slugs never get here: src/proxy.ts 404s them.
 *
 * The filtered listing reads searchParams, so this page renders per request
 * (its data is all 'use cache'). Deliberately no <Suspense> around it:
 * streamed-in content stays hidden without JS, and filters must work
 * without JS.
 */
export const instant = false;

export async function generateStaticParams() {
  const ix = await prerenderIndex();
  return topParams(ix?.brands ?? [], PRERENDER.brands, (b) => b.productCount, (b) => ({ slug: b.slug }), { slug: placeholder });
}

async function load(params: Props["params"]): Promise<{ locale: Locale; brand: PartsBrandDetail }> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const brand = await getPartsBrand(locale, slug);
  if (!brand) notFound();
  return { locale, brand };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, brand } = await load(params);
  const [t, boot, sp] = await Promise.all([getTranslations({ locale }), getBootstrap(locale), searchParams]);
  return catalogMetadata({
    locale,
    href: `/brands/${brand.slug}`,
    title: brand.name,
    seoTitle: brand.seoTitle,
    description:
      brand.seoDescription ||
      brand.description ||
      t("catalog.partsBrand.metaDescription", {
        brand: brand.name,
        grade: brand.isOem ? t("catalog.partsBrand.genuine") : t("catalog.partsBrand.compatible"),
      }),
    image: brand.ogImage || brand.logo,
    noindex: hasActiveFilters(parseListingParams(sp as SearchParamsRecord)) || Boolean(sp.page),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

async function BrandListing({ locale, brand, searchParams }: { locale: Locale; brand: PartsBrandDetail; searchParams: Props["searchParams"] }) {
  const [t, sp, parts, machineBrands, machineModels, boot] = await Promise.all([
    getTranslations({ locale }),
    searchParams,
    getAllParts(locale, { brand: brand.slug }),
    getMachineBrands(locale),
    getMachineModels(locale),
    getBootstrap(locale),
  ]);
  return (
    <ListingView
      locale={locale}
      basePath={`/brands/${brand.slug}`}
      parts={parts}
      params={parseListingParams(sp as SearchParamsRecord)}
      facet="category"
      machineBrands={machineBrands}
      machineModels={machineModels}
      whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone}
      context={t("catalog.partsBrand.context", { brand: brand.name })}
    />
  );
}

export default async function PartsBrandPage({ params, searchParams }: Props) {
  const { locale, brand } = await load(params);
  setRequestLocale(locale);
  const [t, parts, machineBrands] = await Promise.all([
    getTranslations({ locale }),
    getAllParts(locale, { brand: brand.slug }),
    getMachineBrands(locale),
  ]);
  const makesFor = machineBrands.filter((m) => brand.machineBrandSlugs.includes(m.slug));
  const crumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("catalog.brands.title"), href: "/brands" },
    { label: brand.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs, locale, `/brands/${brand.slug}`)} />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {t("catalog.partsBrand.eyebrow")}
            <Badge grade={brand.isOem ? "genuine" : "compatible"} />
          </span>
        }
        title={brand.name}
        lead={
          <>
            {brand.description && <p className="text-re-ink">{brand.description}</p>}
            <p className={brand.description ? "mt-2" : undefined}>
              {t("catalog.partsBrand.lead", { brand: brand.name, count: parts.length })}
            </p>
            <p className="mt-2 text-[0.9375rem]">{brand.isOem ? t("catalog.brands.genuineBody") : t("catalog.brands.compatibleBody")}</p>
          </>
        }
        aside={
          brand.logo ? (
            <CatalogImage src={brand.logo} alt={brand.name} sizes="240px" preload className="aspect-[2/1] w-48 border border-re-ink bg-re-paper md:w-60" />
          ) : undefined
        }
      >
        {makesFor.length > 0 && (
          <nav aria-label={t("catalog.partsBrand.forMachines")} className="mt-6 flex flex-wrap items-center gap-2">
            <span className="re-label mr-1">{t("catalog.partsBrand.forMachines")}</span>
            {makesFor.map((m) => (
              <Link
                key={m.slug}
                href={`/machines/${m.slug}`}
                className="inline-flex min-h-11 items-center rounded-re border border-re-steel-400 bg-re-paper px-3 text-[0.9375rem] font-medium hover:border-re-ink"
              >
                {m.name}
              </Link>
            ))}
          </nav>
        )}
      </SheetHeader>
      <div className="re-shell mt-8">
        <BrandListing locale={locale} brand={brand} searchParams={searchParams} />
      </div>
    </>
  );
}
