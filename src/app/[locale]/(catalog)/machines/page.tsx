import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap, getMachineBrands, getMachineModels } from "@/lib/api/site";
import type { MachineBrandSummary } from "@/lib/api/types";
import { breadcrumbJsonLd, joinList, machineTypeLabel, machineTypeLabels } from "@/lib/catalog/page";
import { catalogMetadata, localePath, localeUrl } from "@/lib/seo/metadata";
import { itemList } from "@/lib/seo/jsonld";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { MachinePicker, type PickerBrand } from "@/components/catalog/MachinePicker";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { JsonLd } from "@/components/catalog/JsonLd";
import { WhatsAppLink } from "@/components/catalog/WhatsAppLink";
import { EmptyParts } from "@/components/catalog/EmptyParts";
import { SectionHeader } from "@/components/ui/SectionHeader";

const byName = (a: MachineBrandSummary, b: MachineBrandSummary) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

export async function generateMetadata({ params }: PageProps<"/[locale]/machines">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, brands, boot] = await Promise.all([getTranslations({ locale }), getMachineBrands(locale), getBootstrap(locale)]);
  return catalogMetadata({
    locale,
    href: "/machines",
    title: t("catalog.machines.title"),
    description: t("catalog.machines.metaDescription", {
      brands: joinList([...brands].sort((a, b) => b.modelCount - a.modelCount).map((b) => b.name), locale, 8),
    }),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

export default async function MachinesPage({ params }: PageProps<"/[locale]/machines">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, brands, models, boot] = await Promise.all([
    getTranslations({ locale }),
    getMachineBrands(locale),
    getMachineModels(locale),
    getBootstrap(locale),
  ]);
  const typeLabels = await machineTypeLabels(locale);
  const sorted = [...brands].sort(byName);
  const totalModels = brands.reduce((n, b) => n + b.modelCount, 0);
  const whatsapp = boot.settings.whatsappNumber || boot.settings.contactPhone;

  const picker: PickerBrand[] = sorted
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      models: models
        .filter((m) => m.brandSlug === b.slug)
        .sort((x, y) => x.name.localeCompare(y.name, "en", { numeric: true }))
        .map((m) => ({ slug: m.slug, name: m.name })),
    }))
    .filter((b) => b.models.length > 0 || brands.length < 30);

  const crumbs = [{ label: t("nav.home"), href: "/" }, { label: t("catalog.machines.crumb") }];


  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, "/machines"),
          itemList(
            sorted.map((b) => ({ name: b.name, url: localeUrl(`/machines/${b.slug}`, locale) })),
            t("catalog.machines.title"),
          ),
        ]}
      />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={t("catalog.machines.eyebrow")}
        title={t("catalog.machines.title")}
        lead={t("catalog.machines.lead")}
        meta={[
          { label: t("catalog.machines.brands"), value: brands.length },
          { label: t("catalog.machines.modelsTotal"), value: totalModels },
        ]}
      >
        {picker.length > 0 && (
          <section aria-labelledby="finder" className="mt-8 border border-re-ink bg-re-paper">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-re-ink px-4 py-2.5">
              <h2 id="finder" className="text-lg">
                {t("catalog.machines.finderTitle")}
              </h2>
              <p className="text-[0.875rem] text-re-steel-600">{t("catalog.machines.finderBody")}</p>
            </div>
            <MachinePicker
              className="p-4"
              action={localePath("/machines/find", locale)}
              machinesPath={localePath("/machines", locale)}
              brands={picker}
              labels={{
                brand: t("catalog.machines.finderBrand"),
                model: t("catalog.machines.finderModel"),
                chooseBrand: t("catalog.machines.finderChooseBrand"),
                anyModel: t("catalog.machines.finderAnyModel"),
                submit: t("catalog.machines.finderSubmit"),
              }}
            />
          </section>
        )}
      </SheetHeader>

      <section aria-labelledby="brand-index" className="re-shell mt-12">
        <SectionHeader
          id="brand-index"
          index="01"
          title={t("catalog.machines.indexHeading")}
          subtitle={t("catalog.machines.indexSub", { count: brands.length })}
        />
        {sorted.length === 0 ? (
          <div className="mt-6">
            <EmptyParts whatsapp={whatsapp} context={t("catalog.machines.title")} title={t("catalog.machines.empty")} body={t("catalog.machines.notListedBody")} />
          </div>
        ) : (
          <>
          {/* Phones: 2-up brand tiles (logo · name · model count). */}
          <ul className="mt-5 grid grid-cols-2 gap-px border border-re-steel-200 bg-re-steel-200 md:hidden">
            {sorted.map((b) => (
              <li key={b.slug} className="bg-re-paper">
                <Link
                  href={`/machines/${b.slug}`}
                  className="flex h-full min-h-32 flex-col justify-between gap-2 p-3 active:bg-re-steel-50"
                >
                  <span className="flex items-start justify-between gap-2">
                    <CatalogImage src={b.logo} alt="" sizes="96px" className="aspect-[2/1] w-24 max-w-[75%] border border-re-steel-200 bg-re-paper" />
                    {b.country && <span className="re-mono text-[0.6875rem] text-re-steel-600">{b.country}</span>}
                  </span>
                  <span>
                    <span className="block text-[1.25rem] leading-tight font-extrabold text-re-ink [font-stretch:75%] bn:font-bold bn:[font-stretch:100%]">
                      {b.name}
                    </span>
                    <span className="re-mono mt-0.5 block text-[0.8125rem] text-re-steel-600">
                      {t("catalog.machines.models", { count: b.modelCount })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {sorted.length % 2 === 1 && <li aria-hidden className="bg-re-steel-50" />}
          </ul>
          <ul className="mt-6 grid border-t border-re-ink max-md:hidden lg:grid-cols-2 lg:gap-x-10">
            {sorted.map((b, i) => {
              // Directory letter (A–Z), shown on the first brand of each initial.
              const initial = b.name.charAt(0).toUpperCase();
              const showInitial = i === 0 || sorted[i - 1].name.charAt(0).toUpperCase() !== initial;
              return (
                <li key={b.slug} className="border-b border-re-steel-200">
                  <Link
                    href={`/machines/${b.slug}`}
                    className="group grid min-h-24 grid-cols-[2rem_4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 pr-1 transition-colors duration-150 hover:bg-re-steel-50 sm:gap-x-4"
                  >
                    <span aria-hidden className="re-mono self-start pt-1 text-[0.8125rem] font-semibold text-re-red-text">
                      {showInitial ? initial : ""}
                    </span>
                    <CatalogImage
                      src={b.logo}
                      alt=""
                      sizes="72px"
                      className="aspect-[3/2] w-[4.5rem] border border-re-steel-200 bg-re-paper"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-[1.5rem] leading-tight font-extrabold text-re-ink [font-stretch:75%] group-hover:text-re-red-text">
                          {b.name}
                        </span>
                        {b.country && <span className="re-label">{b.country}</span>}
                      </span>
                      <span className="mt-1 block truncate text-[0.8125rem] text-re-steel-600">
                        {b.modelCountsByType.length > 0
                          ? b.modelCountsByType
                              .map((x) => `${machineTypeLabel(typeLabels, x.machineType, x.label)} ${x.count}`)
                              .join(" · ")
                          : t("catalog.machines.models", { count: b.modelCount })}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="re-mono hidden text-[0.875rem] text-re-steel-600 sm:inline">
                        {t("catalog.machines.models", { count: b.modelCount })}
                      </span>
                      <ArrowRight aria-hidden className="size-5 text-re-steel-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-re-ink" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </section>

      <section className="re-shell mt-10 md:mt-14">
        <div className="relative grid gap-4 border border-re-steel-200 bg-re-steel-50 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-re-whatsapp" />
          <div className="pl-2">
            <h2 className="text-xl">{t("catalog.machines.notListedTitle")}</h2>
            <p className="mt-1 max-w-2xl text-re-steel-600">{t("catalog.machines.notListedBody")}</p>
          </div>
          <WhatsAppLink number={whatsapp} text={t("catalog.machines.notListedText")} className="w-full justify-self-start sm:w-auto">
            {t("catalog.machines.notListedCta")}
          </WhatsAppLink>
        </div>
      </section>
    </>
  );
}
