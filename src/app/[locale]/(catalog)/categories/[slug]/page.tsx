import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllParts, getBootstrap, getCatalogIndex, getCategory, getMachineBrands, getMachineModels } from "@/lib/api/site";
import type { CategoryDetail, PartSummary } from "@/lib/api/types";
import { hasActiveFilters, parseListingParams, type SearchParamsRecord } from "@/lib/catalog/listing";
import { breadcrumbJsonLd, joinList, placeholder, PRERENDER, topParams } from "@/lib/catalog/page";
import { catalogMetadata } from "@/lib/seo/metadata";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { JsonLd } from "@/components/catalog/JsonLd";
import { ListingView } from "@/components/catalog/ListingView";
import { PART_ICONS, partIconFor } from "@/components/icons/parts";

type Props = PageProps<"/[locale]/categories/[slug]">;

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
  const ix = await getCatalogIndex();
  return topParams(ix?.categories ?? [], PRERENDER.categories, (c) => c.productCount, (c) => ({ slug: c.slug }), { slug: placeholder });
}

async function load(params: Props["params"]): Promise<{ locale: Locale; category: CategoryDetail }> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const category = await getCategory(locale, slug);
  if (!category) notFound();
  return { locale, category };
}

/** A parent category lists its children's parts too. */
async function categoryParts(locale: Locale, category: CategoryDetail): Promise<PartSummary[]> {
  const lists = await Promise.all([category.slug, ...category.children.map((c) => c.slug)].map((s) => getAllParts(locale, { category: s })));
  const seen = new Set<string>();
  return lists.flat().filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, category } = await load(params);
  const [t, boot, sp] = await Promise.all([getTranslations({ locale }), getBootstrap(locale), searchParams]);
  const brands = boot.machineBrands.map((b) => b.name);
  return catalogMetadata({
    locale,
    href: `/categories/${category.slug}`,
    title: category.name,
    seoTitle: category.seoTitle,
    description:
      category.seoDescription ||
      category.description ||
      t("catalog.category.metaDescription", { category: category.name, brands: joinList(brands, locale, 5) }),
    image: category.ogImage || category.bannerImage || category.image,
    // Facet / paged URLs: crawlable but not indexed; canonical is the base.
    noindex: hasActiveFilters(parseListingParams(sp as SearchParamsRecord)) || Boolean(sp.page),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

async function CategoryListing({ locale, category, searchParams }: { locale: Locale; category: CategoryDetail; searchParams: Props["searchParams"] }) {
  const [t, sp, parts, machineBrands, machineModels, boot] = await Promise.all([
    getTranslations({ locale }),
    searchParams,
    categoryParts(locale, category),
    getMachineBrands(locale),
    getMachineModels(locale),
    getBootstrap(locale),
  ]);
  return (
    <ListingView
      locale={locale}
      basePath={`/categories/${category.slug}`}
      parts={parts}
      params={parseListingParams(sp as SearchParamsRecord)}
      facet="brand"
      machineBrands={machineBrands}
      machineModels={machineModels}
      whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone}
      context={t("catalog.category.context", { category: category.name })}
    />
  );
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category } = await load(params);
  setRequestLocale(locale);
  const [t, total] = await Promise.all([
    getTranslations({ locale }),
    categoryParts(locale, category).then((p) => p.length),
  ]);
  const iconKey = partIconFor(`${category.slug} ${category.name}`);
  const Icon = iconKey ? PART_ICONS[iconKey] : null;

  const crumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("catalog.categories.title"), href: "/categories" },
    ...(category.parent ? [{ label: category.parent.name, href: `/categories/${category.parent.slug}` }] : []),
    { label: category.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs, locale, `/categories/${category.slug}`)} />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={t("catalog.category.eyebrow")}
        title={category.name}
        lead={
          <>
            {category.description && <p className="text-re-ink">{category.description}</p>}
            <p className={category.description ? "mt-2" : undefined}>
              {t("catalog.category.lead", { category: category.name, count: total })}
            </p>
          </>
        }
        aside={
          Icon ? (
            <span aria-hidden className="hidden size-32 place-items-center border border-re-ink bg-re-paper text-re-ink md:grid lg:size-40">
              <Icon className="size-20 lg:size-24" />
            </span>
          ) : undefined
        }
      >
        {category.children.length > 0 && (
          <nav aria-label={t("catalog.category.children")} className="mt-6 flex flex-wrap items-center gap-2">
            <span className="re-label mr-1">{t("catalog.category.children")}</span>
            {category.children.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="inline-flex min-h-11 items-center rounded-re border border-re-steel-400 bg-re-paper px-3 text-[0.9375rem] hover:border-re-ink"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </SheetHeader>

      <div className="re-shell mt-8">
        <CategoryListing locale={locale} category={category} searchParams={searchParams} />
      </div>
    </>
  );
}
