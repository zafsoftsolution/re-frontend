import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap, getCatalogIndex, getMachineBrand, getMachineModels } from "@/lib/api/site";
import type { MachineModelSummary } from "@/lib/api/types";
import { breadcrumbJsonLd, joinList, machineTypeLabel, machineTypeLabels, placeholder, PRERENDER, topParams } from "@/lib/catalog/page";
import { catalogMetadata, localeUrl } from "@/lib/seo/metadata";
import { itemList } from "@/lib/seo/jsonld";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { JsonLd } from "@/components/catalog/JsonLd";
import { EmptyParts } from "@/components/catalog/EmptyParts";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * Params not in generateStaticParams render on first request (blocking —
 * no generic App Shell: params are validated before anything streams) and
 * are then cached. Unknown slugs never get here: src/proxy.ts 404s them.
 */
export const instant = false;

export async function generateStaticParams() {
  const ix = await getCatalogIndex();
  const counts = new Map<string, number>();
  for (const m of ix?.machineModels ?? []) counts.set(m.brandSlug, (counts.get(m.brandSlug) ?? 0) + 1);
  return topParams(ix?.machineBrands ?? [], PRERENDER.machineBrands, (b) => counts.get(b) ?? 0, (brand) => ({ brand }), {
    brand: placeholder,
  });
}

type Props = PageProps<"/[locale]/machines/[brand]">;

async function load(params: Props["params"]) {
  const locale = await resolveLocale(params);
  const { brand: slug } = await params;
  const brand = await getMachineBrand(locale, slug);
  if (!brand) notFound();
  return { locale, brand };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brand } = await load(params);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const typeLabels = await machineTypeLabels(locale);
  const types = joinList(brand.modelCountsByType.map((x) => machineTypeLabel(typeLabels, x.machineType, x.label)), locale, 4);
  return catalogMetadata({
    locale,
    href: `/machines/${brand.slug}`,
    title: t("catalog.brand.title", { brand: brand.name }),
    seoTitle: brand.seoTitle,
    description:
      brand.seoDescription || t("catalog.brand.metaDescription", { brand: brand.name, types: types ? ` — ${types}` : "" }),
    image: brand.ogImage || brand.logo,
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

const byCode = (a: MachineModelSummary, b: MachineModelSummary) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" });

export default async function MachineBrandPage({ params }: Props) {
  const { locale, brand } = await load(params);
  setRequestLocale(locale);
  const [t, models, boot] = await Promise.all([
    getTranslations({ locale }),
    getMachineModels(locale, brand.slug),
    getBootstrap(locale),
  ]);
  const typeLabels = await machineTypeLabels(locale);
  const whatsapp = boot.settings.whatsappNumber || boot.settings.contactPhone;

  // Groups in the backend's machine-type order, then any type it didn't count.
  const order = brand.modelCountsByType.map((x) => x.machineType);
  const groups = new Map<string, { label: string; models: MachineModelSummary[] }>();
  for (const m of [...models].sort(byCode)) {
    const key = m.machineType || "other";
    const g = groups.get(key) ?? { label: machineTypeLabel(typeLabels, key, m.machineTypeDisplay), models: [] };
    g.models.push(m);
    groups.set(key, g);
  }
  const sortedGroups = [...groups].sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const totalParts = models.reduce((n, m) => n + m.partsCount, 0);

  const crumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("catalog.machines.title"), href: "/machines" },
    { label: brand.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, `/machines/${brand.slug}`),
          itemList(
            models.map((m) => ({ name: `${brand.name} ${m.name}`, url: localeUrl(`/machines/${brand.slug}/${m.slug}`, locale) })),
            t("catalog.brand.modelsHeading", { brand: brand.name }),
          ),
        ]}
      />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={t("catalog.brand.eyebrow", { brand: brand.name })}
        title={t("catalog.brand.title", { brand: brand.name })}
        lead={
          <>
            {brand.description && <p className="text-re-ink">{brand.description}</p>}
            <p className={brand.description ? "mt-2" : undefined}>
              {t("catalog.brand.lead", { brand: brand.name, count: models.length })}
            </p>
          </>
        }
        meta={[
          ...(brand.country ? [{ label: t("catalog.machines.country"), value: brand.country }] : []),
          { label: t("catalog.machines.modelsTotal"), value: models.length },
          { label: t("catalog.brand.types"), value: sortedGroups.length },
          { label: t("catalog.model.partsCount"), value: totalParts },
        ]}
        aside={
          brand.logo ? (
            <CatalogImage
              src={brand.logo}
              alt={brand.name}
              sizes="240px"
              preload
              className="aspect-[2/1] w-48 border border-re-ink bg-re-paper md:w-60"
            />
          ) : undefined
        }
      />

      <div className="re-shell mt-10">
        {sortedGroups.length > 0 && (
          <nav aria-label={t("catalog.brand.types")} className="-mx-1 flex flex-wrap gap-2">
            {sortedGroups.map(([key, g]) => (
              <a
                key={key}
                href={`#type-${key}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-re border border-re-steel-200 px-3 text-[0.9375rem] font-medium hover:border-re-ink"
              >
                {g.label}
                <span className="re-mono text-[0.8125rem] text-re-steel-600">{g.models.length}</span>
              </a>
            ))}
          </nav>
        )}

        <section aria-labelledby="models" className="mt-10">
          <SectionHeader
            id="models"
            index="01"
            title={t("catalog.brand.modelsHeading", { brand: brand.name })}
            subtitle={t("catalog.brand.modelsSub")}
          />
          {models.length === 0 ? (
            <div className="mt-6">
              <EmptyParts
                whatsapp={whatsapp}
                context={brand.name}
                title={t("catalog.brand.noModels", { brand: brand.name })}
                body={t("catalog.machines.notListedBody")}
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-10">
              {sortedGroups.map(([key, g], gi) => (
                <section key={key} id={`type-${key}`} aria-labelledby={`type-${key}-h`} className="scroll-mt-24">
                  <h3 id={`type-${key}-h`} className="flex items-baseline gap-3 text-xl">
                    <span className="re-mono text-[0.8125rem] font-medium text-re-steel-400">
                      {String(gi + 1).padStart(2, "0")}
                    </span>
                    {g.label}
                    <span className="re-mono text-[0.8125rem] font-normal text-re-steel-600">
                      {t("catalog.brand.typeCount", { count: g.models.length })}
                    </span>
                  </h3>
                  <table className="mt-3 w-full border-collapse text-left">
                    <caption className="sr-only">
                      {brand.name} · {g.label}
                    </caption>
                    <thead>
                      <tr className="border-b border-re-ink">
                        <th scope="col" className="re-label px-2 py-2 font-medium">
                          {t("catalog.brand.colModel")}
                        </th>
                        <th scope="col" className="re-label px-2 py-2 text-right font-medium">
                          {t("catalog.brand.colParts")}
                        </th>
                        <th scope="col" className="w-10">
                          <span className="sr-only">→</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.models.map((m) => (
                        <tr key={m.slug} className="group relative border-b border-re-steel-200 hover:bg-re-steel-50">
                          <th scope="row" className="px-2 py-0 font-normal">
                            <Link
                              href={`/machines/${brand.slug}/${m.slug}`}
                              className="flex min-h-12 items-center after:absolute after:inset-0 after:content-['']"
                            >
                              <span className="re-mono text-[1.0625rem] font-semibold text-re-ink group-hover:text-re-red-text">
                                {m.name}
                              </span>
                            </Link>
                          </th>
                          <td className="re-mono px-2 text-right text-[0.875rem] text-re-steel-600">
                            {t("catalog.brand.parts", { count: m.partsCount })}
                          </td>
                          <td className="px-2 text-right">
                            <ArrowRight aria-hidden className="ml-auto size-4 text-re-steel-400 group-hover:text-re-ink" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
