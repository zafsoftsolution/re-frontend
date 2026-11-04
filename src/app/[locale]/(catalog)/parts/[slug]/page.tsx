import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllParts, getBootstrap, getCatalogIndex, getPart } from "@/lib/api/site";
import type { MachineModelSummary, PartDetail, PartSummary } from "@/lib/api/types";
import { imageSource, type ImageSource } from "@/lib/media";
import { formatBDT } from "@/lib/format";
import { breadcrumbJsonLd, placeholder, PRERENDER, topParams } from "@/lib/catalog/page";
import { catalogMetadata, localeUrl } from "@/lib/seo/metadata";
import { productJsonLd } from "@/lib/seo/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PartNumber } from "@/components/ui/PartNumber";
import { StockBadge } from "@/components/ui/StockBadge";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { JsonLd } from "@/components/catalog/JsonLd";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { PartGallery } from "@/components/catalog/PartGallery";
import { PartBuyBox } from "@/components/catalog/PartBuyBox";
import { PartsTable, gradeFor } from "@/components/catalog/PartsTable";
import { WhatsAppLink } from "@/components/catalog/WhatsAppLink";

type Props = PageProps<"/[locale]/parts/[slug]">;

/**
 * Params not in generateStaticParams render on first request (blocking —
 * no generic App Shell: params are validated before anything streams) and
 * are then cached. Unknown slugs never get here: src/proxy.ts 404s them.
 */
export const instant = false;

export async function generateStaticParams() {
  const ix = await getCatalogIndex();
  return topParams(ix?.parts ?? [], PRERENDER.parts, () => 0, (slug) => ({ slug }), { slug: placeholder });
}

async function load(params: Props["params"]): Promise<{ locale: Locale; part: PartDetail }> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const part = await getPart(locale, slug);
  if (!part) notFound();
  return { locale, part };
}

const titleOf = (p: PartDetail) => (p.partNumber && !p.name.includes(p.partNumber) ? `${p.partNumber} · ${p.name}` : p.name);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, part } = await load(params);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const fits = part.machineModels.slice(0, 3).map((m) => `${m.brandName} ${m.name}`).join(", ");
  const description =
    part.seoDescription ||
    [part.shortDescription || part.name, part.partNumber && `${t("ui.partNumber")} ${part.partNumber}`, fits && `${t("catalog.part.fits")}: ${fits}`]
      .filter(Boolean)
      .join(" · ");
  return catalogMetadata({
    locale,
    href: `/parts/${part.slug}`,
    title: titleOf(part),
    seoTitle: part.seoTitle,
    description,
    image: part.ogImage || part.images[0] || part.image,
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

/** Up to 6 parts of the same type, preferring ones that share a machine. */
function relatedParts(part: PartDetail, pool: PartSummary[]): PartSummary[] {
  const models = new Set(part.machineModelSlugs);
  const ids = new Set(part.relatedIds);
  return pool
    .filter((p) => p.slug !== part.slug)
    .map((p) => ({ p, score: (ids.has(p.id) ? 10 : 0) + p.machineModelSlugs.filter((m) => models.has(m)).length }))
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, 6)
    .map((x) => x.p);
}

function groupModels(models: MachineModelSummary[]) {
  const by = new Map<string, { brandSlug: string; brandName: string; models: MachineModelSummary[] }>();
  for (const m of models) {
    const g = by.get(m.brandSlug) ?? { brandSlug: m.brandSlug, brandName: m.brandName, models: [] };
    g.models.push(m);
    by.set(m.brandSlug, g);
  }
  return [...by.values()];
}

export default async function PartPage({ params }: Props) {
  const { locale, part } = await load(params);
  setRequestLocale(locale);
  const [t, boot, pool] = await Promise.all([
    getTranslations({ locale }),
    getBootstrap(locale),
    part.category ? getAllParts(locale, { category: part.category.slug }) : Promise.resolve([] as PartSummary[]),
  ]);
  const direct = part.salesMode === "direct" && part.price !== null;
  const url = localeUrl(`/parts/${part.slug}`, locale);
  const whatsapp = boot.settings.whatsappNumber || boot.settings.contactPhone;
  const grade = gradeFor(part.brand ? part.brand.isOem : part.brandIsOem);
  const images = part.images.map(imageSource).filter((x): x is ImageSource => x !== null);
  const related = relatedParts(part, pool);
  const fitsGroups = groupModels(part.machineModels);

  const crumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.parts"), href: "/categories" },
    ...(part.category ? [{ label: part.category.name, href: `/categories/${part.category.slug}` }] : []),
    { label: part.partNumber || part.name },
  ];

  const facts: { label: string; value: ReactNode }[] = [
    ...(part.category
      ? [
          {
            label: t("catalog.part.category"),
            value: (
              <Link href={`/categories/${part.category.slug}`} className="text-re-blue hover:underline">
                {part.category.name}
              </Link>
            ),
          },
        ]
      : []),
    ...(part.brand
      ? [
          {
            label: t("catalog.part.partsBrand"),
            value: (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Link href={`/brands/${part.brand.slug}`} className="text-re-blue hover:underline">
                  {part.brand.name}
                </Link>
                {grade && <Badge grade={grade} />}
              </span>
            ),
          },
        ]
      : []),
    {
      label: t("catalog.part.availability"),
      value: (
        <span className="grid gap-0.5">
          <StockBadge availability={part.availability} />
          {part.leadTimeDays !== null && part.leadTimeDays > 0 && (
            <span className="text-[0.8125rem] text-re-steel-600">{t("catalog.part.leadTime", { days: part.leadTimeDays })}</span>
          )}
        </span>
      ),
    },
    ...(part.minOrderQuantity > 1
      ? [{ label: t("catalog.part.moq"), value: <span className="re-mono">{t("catalog.part.moqValue", { qty: part.minOrderQuantity })}</span> }]
      : []),
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, `/parts/${part.slug}`),
          productJsonLd(part, { url, compatibleWith: part.machineModels.map((m) => `${m.brandName} ${m.name}`) }),
        ]}
      />
      <div className="re-shell py-5 md:py-8">
        <Breadcrumbs items={crumbs} />

        <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          {/* Photos */}
          <div className="md:sticky md:top-4 md:self-start">
            {images.length > 0 ? (
              <PartGallery images={images} alt={part.name} thumbLabel={t("catalog.part.photo")} />
            ) : (
              <figure>
                <CatalogImage
                  src={null}
                  alt=""
                  sizes="(min-width: 48rem) 40vw, 100vw"
                  hint={`${part.categorySlug} ${part.categoryName}`}
                  className="border border-re-steel-200"
                  iconClassName="size-1/3"
                />
                <figcaption className="mt-2 text-[0.875rem] text-re-steel-600">{t("catalog.part.noPhoto")}</figcaption>
              </figure>
            )}
          </div>

          {/* Spec sheet + actions */}
          <div className="min-w-0">
            <p className="re-label flex items-center gap-2">
              <span aria-hidden className="inline-block size-2.5 bg-re-red" />
              {t("catalog.part.eyebrow", { category: part.category?.name || part.categoryName || "—" })}
            </p>
            <h1 className="mt-3 text-[1.875rem] leading-[1.08] font-extrabold text-re-ink [font-stretch:78%] sm:text-[2.375rem] bn:text-[1.75rem] bn:leading-[1.35] bn:font-bold bn:[font-stretch:100%]">
              {part.name}
            </h1>

            {part.partNumber && (
              <div className="mt-5">
                <PartNumber value={part.partNumber} labelled size="lg" className="[&_.re-mono]:text-[1.375rem] sm:[&_.re-mono]:text-[1.625rem]" />
              </div>
            )}
            {part.altPartNumbers.length > 0 && (
              <div className="mt-3">
                <p className="re-label">{t("catalog.part.altNumbers")}</p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {part.altPartNumbers.map((n) => (
                    <li key={n} translate="no" className="re-mono text-[0.9375rem] text-re-ink">
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="mt-6 grid border-t border-re-ink sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="border-b border-re-steel-200 py-3 sm:odd:pr-4 sm:even:border-l sm:even:pl-4">
                  <dt className="re-label">{f.label}</dt>
                  <dd className="mt-1 text-[0.9375rem]">{f.value}</dd>
                </div>
              ))}
            </dl>

            {/* Price + CTAs */}
            <div className="mt-6 border border-re-ink p-4 sm:p-5">
              <p className="re-label">{t("catalog.part.price")}</p>
              <div className="mt-1">
                <Price amount={direct ? part.price : null} compareAt={direct ? part.compareAtPrice : null} size="lg" />
              </div>
              <p className="mt-2 flex gap-2 text-[0.875rem] text-re-steel-600">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {direct ? t("catalog.part.directNote") : t("catalog.part.quoteNote")}
              </p>

              {direct && part.priceTiers.length > 0 && (
                <table className="mt-4 w-full max-w-sm border-collapse text-[0.9375rem]">
                  <caption className="re-label mb-1 text-left">{t("catalog.part.tiers")}</caption>
                  <thead>
                    <tr className="border-b border-re-ink">
                      <th scope="col" className="re-label py-1.5 text-left font-medium">
                        {t("catalog.part.tierFrom")}
                      </th>
                      <th scope="col" className="re-label py-1.5 text-right font-medium">
                        {t("catalog.part.tierUnit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {part.priceTiers.map((tier) => (
                      <tr key={tier.minQuantity} className="border-b border-re-steel-200">
                        <th scope="row" className="re-mono py-1.5 text-left font-normal">
                          {t("catalog.part.tierQty", { qty: tier.minQuantity })}
                        </th>
                        <td translate="no" className="re-mono py-1.5 text-right font-semibold">
                          {formatBDT(tier.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-5">
                <PartBuyBox
                  productSlug={part.slug}
                  partNumber={part.partNumber}
                  name={part.name}
                  moq={part.minOrderQuantity}
                  {...(direct && part.price !== null ? { direct: { price: part.price } } : {})}
                  labels={{ qty: t("catalog.part.qty"), decrease: t("catalog.part.decrease"), increase: t("catalog.part.increase") }}
                />
              </div>
              <WhatsAppLink
                number={whatsapp}
                text={t("catalog.part.whatsappText", { name: part.name, partNumber: part.partNumber || "—", url })}
                variant="secondary"
                className="mt-3 w-full border-re-whatsapp text-re-whatsapp hover:border-re-whatsapp hover:bg-re-whatsapp hover:text-white sm:w-auto"
              >
                {t("catalog.part.whatsapp")}
              </WhatsAppLink>
            </div>

            {/* Fits */}
            <section aria-labelledby="fits" className="mt-8">
              <h2 id="fits" className="text-xl">
                {t("catalog.part.fits")}
                {part.machineModels.length > 0 && (
                  <span className="re-mono ml-2 text-[0.875rem] font-normal text-re-steel-600">{part.machineModels.length}</span>
                )}
              </h2>
              {fitsGroups.length === 0 ? (
                <p className="mt-2 text-re-steel-600">{t("catalog.part.fitsNone")}</p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {fitsGroups.map((g) => (
                    <div key={g.brandSlug} className="flex flex-wrap items-center gap-2">
                      <Link href={`/machines/${g.brandSlug}`} className="w-full text-[0.875rem] font-semibold text-re-steel-600 hover:text-re-blue sm:w-24">
                        {g.brandName}
                      </Link>
                      {g.models.map((m) => (
                        <Link
                          key={m.slug}
                          href={`/machines/${m.brandSlug}/${m.slug}`}
                          translate="no"
                          className="re-mono inline-flex min-h-11 items-center rounded-re border border-re-steel-400 px-3 text-[0.9375rem] font-medium text-re-ink hover:border-re-ink hover:bg-re-ink hover:text-white"
                        >
                          {m.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {(part.specifications.length > 0 || part.description) && (
          <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
            {part.specifications.length > 0 && (
              <section aria-labelledby="specs">
                <SectionHeader id="specs" index="01" title={t("catalog.part.specs")} />
                <table className="mt-4 w-full border-collapse text-[0.9375rem]">
                  <caption className="sr-only">
                    {t("catalog.part.specs")} — {part.name}
                  </caption>
                  <tbody>
                    {part.specifications.map(([k, v]) => (
                      <tr key={k} className="border-b border-re-steel-200">
                        <th scope="row" className="w-2/5 py-2.5 pr-4 text-left align-top font-medium text-re-steel-600">
                          {k}
                        </th>
                        <td className="re-mono py-2.5 text-re-ink">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {part.description && (
              <section aria-labelledby="desc">
                <SectionHeader id="desc" index={part.specifications.length ? "02" : "01"} title={t("catalog.part.description")} />
                <div className="mt-4 max-w-prose whitespace-pre-line text-re-ink">{part.description}</div>
                {grade && (
                  <p className="mt-4 text-[0.875rem] text-re-steel-600">
                    {grade === "genuine" ? t("catalog.part.brandGenuine") : t("catalog.part.brandCompatible")}
                  </p>
                )}
              </section>
            )}
          </div>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-14">
            <SectionHeader id="related" title={t("catalog.part.related")} subtitle={t("catalog.part.relatedSub")} />
            <PartsTable parts={related} caption={t("catalog.part.related")} className="mt-4" />
          </section>
        )}
      </div>
    </>
  );
}
