import type { Metadata } from "next";
import { ArrowRight, ScanSearch } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getAllParts, getBootstrap } from "@/lib/api/site";
import { MIN_MODEL_CATEGORY_PARTS } from "@/lib/api/catalog-index";
import { groupByCategory, loadModel } from "@/lib/catalog/model";
import { breadcrumbJsonLd, joinList, machineTypeLabel, machineTypeLabels, placeholder, PRERENDER, topParams, prerenderIndex } from "@/lib/catalog/page";
import { catalogMetadata, localeUrl } from "@/lib/seo/metadata";
import { itemList } from "@/lib/seo/jsonld";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { JsonLd } from "@/components/catalog/JsonLd";
import { PartsTable } from "@/components/catalog/PartsTable";
import { EmptyParts } from "@/components/catalog/EmptyParts";
import { WhatsAppLink } from "@/components/catalog/WhatsAppLink";
import { PART_ICONS, partIconFor } from "@/components/icons/parts";

type Props = PageProps<"/[locale]/machines/[brand]/[model]">;

/** Runs once per prerendered brand: that brand's best-stocked models. */
/**
 * Params not in generateStaticParams render on first request (blocking —
 * no generic App Shell: params are validated before anything streams) and
 * are then cached. Unknown slugs never get here: src/proxy.ts 404s them.
 */
export const instant = false;

export async function generateStaticParams({ params }: { params: { brand: string } }) {
  const ix = await prerenderIndex();
  return topParams(
    (ix?.machineModels ?? []).filter((m) => m.brandSlug === params.brand),
    PRERENDER.modelsPerBrand,
    (m) => m.partsCount,
    (m) => ({ model: m.slug }),
    { model: placeholder },
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { brand, model: slug } = await params;
  const model = await loadModel(locale, brand, slug);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const cats = joinList(model.categories.map((c) => c.name), locale, 4);
  return catalogMetadata({
    locale,
    href: `/machines/${model.brandSlug}/${model.slug}`,
    title: t("catalog.model.title", { brand: model.brandName, model: model.name }),
    seoTitle: model.seoTitle,
    description:
      model.seoDescription ||
      t("catalog.model.metaDescription", { brand: model.brandName, model: model.name, categories: cats ? `: ${cats}` : "" }),
    image: model.image || model.brand.logo,
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

export default async function MachineModelPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { brand: brandSlug, model: modelSlug } = await params;
  const model = await loadModel(locale, brandSlug, modelSlug);
  setRequestLocale(locale);
  const [t, parts, boot] = await Promise.all([
    getTranslations({ locale }),
    getAllParts(locale, { machineModel: model.slug }),
    getBootstrap(locale),
  ]);
  const typeLabels = await machineTypeLabels(locale);
  const type = machineTypeLabel(typeLabels, model.machineType, model.machineTypeDisplay);
  const whatsapp = boot.settings.whatsappNumber || boot.settings.contactPhone;
  const groups = groupByCategory(model.categories, parts);
  const base = `/machines/${model.brandSlug}/${model.slug}`;
  const context = t("catalog.model.context", { brand: model.brandName, model: model.name });

  const crumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("catalog.machines.crumb"), href: "/machines" },
    { label: model.brandName, href: `/machines/${model.brandSlug}` },
    { label: model.name },
  ];

  const diagram = (
    <section aria-labelledby="diagram" className="border border-dashed border-re-steel-400 p-4">
      <h2 id="diagram" className="re-label flex items-center gap-2 text-re-ink">
        <ScanSearch aria-hidden className="size-4" strokeWidth={1.75} />
        {t("catalog.model.diagram")}
      </h2>
      <p className="mt-2 text-[0.875rem] text-re-steel-600">{t("catalog.model.diagramMissing")}</p>
      <WhatsAppLink
        number={whatsapp}
        text={t("catalog.listing.emptyWhatsappText", { context })}
        size="sm"
        className="mt-3 max-md:h-11 max-md:w-full max-md:text-sm"
      >
        {t("catalog.listing.emptyCta")}
      </WhatsAppLink>
    </section>
  );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, base),
          itemList(
            parts.map((p) => ({ name: p.partNumber ? `${p.partNumber} — ${p.name}` : p.name, url: localeUrl(`/parts/${p.slug}`, locale) })),
            t("catalog.model.title", { brand: model.brandName, model: model.name }),
          ),
        ]}
      />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={t("catalog.model.eyebrow", { brand: model.brandName, type })}
        titleClassName="max-w-none"
        title={
          <>
            <span translate="no" className="re-mono block text-[2.75rem] leading-none font-semibold tracking-[-0.02em] sm:text-[4rem] lg:text-[5rem]">
              {model.name}
            </span>
            <span className="mt-3 block text-[1.25rem] font-bold text-re-steel-600 [font-stretch:85%] sm:text-[1.5rem] bn:text-[1.25rem]">
              {t("catalog.model.title", { brand: model.brandName, model: model.name })}
            </span>
          </>
        }
        lead={
          <>
            {model.description && <p className="text-re-ink">{model.description}</p>}
            <p className={model.description ? "mt-2" : undefined}>
              {t("catalog.model.lead", { brand: model.brandName, model: model.name, count: parts.length })}
            </p>
          </>
        }
        meta={[
          { label: t("catalog.model.brand"), value: model.brandName },
          { label: t("catalog.model.type"), value: type },
          { label: t("catalog.model.partsCount"), value: parts.length },
          { label: t("catalog.model.partTypes"), value: groups.length },
        ]}
        aside={
          model.image ? (
            <CatalogImage
              src={model.image}
              alt={t("catalog.model.machineImage", { brand: model.brandName, model: model.name })}
              sizes="(min-width: 48rem) 280px, 100vw"
              preload
              className="w-full border border-re-ink bg-re-paper md:w-72"
            />
          ) : undefined
        }
      />

      <div className="re-shell mt-6 grid gap-6 md:mt-8 md:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* Phones/tablets: the part-type chips stick under the app bar while the groups scroll. */}
        <aside className="min-w-0 max-lg:sticky max-md:top-14 max-lg:z-20 max-md:-mx-4 max-md:px-4 md:max-lg:-mx-6 md:max-lg:px-6 max-lg:border-b max-lg:border-re-steel-200 max-lg:bg-re-paper/95 max-lg:backdrop-blur-[2px] md:max-lg:top-0 lg:order-none">
          <div className="grid gap-6 max-lg:grid-cols-[minmax(0,1fr)] lg:sticky lg:top-4">
            {groups.length > 0 && (
              <nav aria-labelledby="jump" className="lg:border-t lg:border-re-ink lg:pt-3">
                <h2 id="jump" className="re-label mb-2 text-re-ink max-lg:sr-only">
                  {t("catalog.model.jumpTo")}
                </h2>
                <ul className="flex gap-2 max-lg:-mx-4 max-lg:overflow-x-auto max-lg:px-4 max-lg:py-2 max-lg:[scrollbar-width:none] lg:grid lg:gap-0">
                  {groups.map((g) => {
                    const iconKey = partIconFor(`${g.slug} ${g.name}`);
                    const Icon = iconKey ? PART_ICONS[iconKey] : null;
                    return (
                      <li key={g.slug}>
                        <a
                          href={`#cat-${g.slug}`}
                          className="flex min-h-11 items-center gap-2 rounded-re border border-re-steel-200 bg-re-paper px-3 text-[0.9375rem] whitespace-nowrap hover:border-re-ink lg:rounded-none lg:border-0 lg:border-b lg:px-1 lg:whitespace-normal lg:hover:bg-re-steel-50"
                        >
                          {Icon && <Icon aria-hidden className="size-5 shrink-0 text-re-steel-600" />}
                          <span className="min-w-0 flex-1 truncate">{g.name}</span>
                          <span className="re-mono text-[0.8125rem] text-re-steel-600">{g.parts.length}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            <div className="hidden lg:block">{diagram}</div>
          </div>
        </aside>

        <div className="min-w-0">
          {groups.length === 0 ? (
            <EmptyParts
              whatsapp={whatsapp}
              context={context}
              title={t("catalog.model.noPartsTitle", { model: model.name })}
              body={t("catalog.model.noPartsBody")}
            />
          ) : (
            <div className="grid gap-10 md:gap-12">
              {groups.map((g, i) => (
                <section key={g.slug} id={`cat-${g.slug}`} aria-labelledby={`cat-${g.slug}-h`} className="scroll-mt-20 max-lg:scroll-mt-[4.5rem]">
                  <header className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-re-steel-200 pt-4">
                    <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
                    <h2 id={`cat-${g.slug}-h`} className="flex items-baseline gap-3 text-[1.375rem] sm:text-[1.75rem]">
                      <span className="re-mono text-[0.8125rem] font-medium text-re-steel-400">§ {String(i + 1).padStart(2, "0")}</span>
                      {g.name}
                      <span className="re-mono text-[0.875rem] font-normal text-re-steel-600">{g.parts.length}</span>
                    </h2>
                    {g.parts.length >= MIN_MODEL_CATEGORY_PARTS && (
                      <Link
                        href={`${base}/${g.slug}`}
                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-re-blue hover:underline"
                      >
                        {t("catalog.model.seeAll", { count: g.parts.length, category: g.name, model: model.name })}
                        <ArrowRight aria-hidden className="size-4" />
                      </Link>
                    )}
                  </header>
                  <PartsTable
                    parts={g.parts}
                    caption={`${g.name} — ${model.brandName} ${model.name}`}
                    showFits={false}
                    className="mt-4"
                  />
                </section>
              ))}
            </div>
          )}
          <div className="mt-10 lg:hidden">{diagram}</div>
        </div>
      </div>
    </>
  );
}
