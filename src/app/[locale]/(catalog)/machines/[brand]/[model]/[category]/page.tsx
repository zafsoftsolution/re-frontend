import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllParts, getBootstrap, getCategory } from "@/lib/api/site";
import { MIN_MODEL_CATEGORY_PARTS } from "@/lib/api/catalog-index";
import { loadModel } from "@/lib/catalog/model";
import { sortParts } from "@/lib/catalog/listing";
import { breadcrumbJsonLd, placeholder, PRERENDER, topParams, prerenderIndex } from "@/lib/catalog/page";
import { catalogMetadata, localePath, localeUrl } from "@/lib/seo/metadata";
import { itemList } from "@/lib/seo/jsonld";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { JsonLd } from "@/components/catalog/JsonLd";
import { PartsTable } from "@/components/catalog/PartsTable";

type Props = PageProps<"/[locale]/machines/[brand]/[model]/[category]">;

/** Runs once per prerendered model: its biggest model × category combos. */
/**
 * Params not in generateStaticParams render on first request (blocking —
 * no generic App Shell: params are validated before anything streams) and
 * are then cached. Unknown slugs never get here: src/proxy.ts 404s them.
 */
export const instant = false;

export async function generateStaticParams({ params }: { params: { brand: string; model: string } }) {
  const ix = await prerenderIndex();
  return topParams(
    (ix?.modelCategories ?? []).filter((r) => r.brandSlug === params.brand && r.modelSlug === params.model),
    PRERENDER.categoriesPerModel,
    (r) => r.count,
    (r) => ({ category: r.categorySlug }),
    { category: placeholder },
  );
}

async function load(locale: Locale, params: Awaited<Props["params"]>) {
  const model = await loadModel(locale, params.brand, params.model);
  const cat = model.categories.find((c) => c.slug === params.category);
  if (!cat) notFound();
  // Thin combos live on the model page (the proxy redirects these first).
  if (cat.count < MIN_MODEL_CATEGORY_PARTS) {
    redirect(`${localePath(`/machines/${model.brandSlug}/${model.slug}`, locale)}#cat-${cat.slug}`);
  }
  return { model, cat };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { model, cat } = await load(locale, await params);
  const [t, boot, category] = await Promise.all([getTranslations({ locale }), getBootstrap(locale), getCategory(locale, cat.slug)]);
  const vars = { brand: model.brandName, model: model.name, category: cat.name, count: cat.count };
  return catalogMetadata({
    locale,
    href: `/machines/${model.brandSlug}/${model.slug}/${cat.slug}`,
    title: t("catalog.modelCategory.title", vars),
    description: t("catalog.modelCategory.metaDescription", vars),
    image: category?.ogImage || category?.image || model.image,
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

export default async function ModelCategoryPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { model, cat } = await load(locale, await params);
  setRequestLocale(locale);
  const [t, all, category] = await Promise.all([
    getTranslations({ locale }),
    getAllParts(locale, { machineModel: model.slug }),
    getCategory(locale, cat.slug),
  ]);
  const parts = sortParts(
    all.filter((p) => p.categorySlug === cat.slug),
    "availability",
  );
  const base = `/machines/${model.brandSlug}/${model.slug}`;
  const href = `${base}/${cat.slug}`;
  const vars = { brand: model.brandName, model: model.name, category: cat.name, count: parts.length };
  const others = model.categories.filter((c) => c.slug !== cat.slug);

  const crumbs = [
    { label: t("nav.home"), href: "/" },
    { label: t("catalog.machines.crumb"), href: "/machines" },
    { label: model.brandName, href: `/machines/${model.brandSlug}` },
    { label: model.name, href: base },
    { label: cat.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, href),
          itemList(
            parts.map((p) => ({ name: p.partNumber ? `${p.partNumber} — ${p.name}` : p.name, url: localeUrl(`/parts/${p.slug}`, locale) })),
            t("catalog.modelCategory.title", vars),
          ),
        ]}
      />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={t("catalog.modelCategory.eyebrow", vars)}
        title={t("catalog.modelCategory.title", vars)}
        lead={
          <>
            <p>{t("catalog.modelCategory.lead", vars)}</p>
            {category?.description && <p className="mt-2">{category.description}</p>}
          </>
        }
        meta={[
          { label: t("catalog.model.brand"), value: model.brandName },
          { label: t("catalog.brand.colModel"), value: <span translate="no">{model.name}</span> },
          { label: t("catalog.part.category"), value: cat.name },
          { label: t("catalog.model.partsCount"), value: parts.length },
        ]}
      />

      <div className="re-shell mt-8">
        <Link href={`${base}#cat-${cat.slug}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-re-blue hover:underline">
          <ArrowLeft aria-hidden className="size-4" />
          {t("catalog.modelCategory.back", vars)}
        </Link>
        <PartsTable parts={parts} caption={t("catalog.modelCategory.title", vars)} className="mt-4" />

        {others.length > 0 && (
          <nav aria-labelledby="other-types" className="mt-12 border-t border-re-steel-200 pt-5">
            <h2 id="other-types" className="text-xl">
              {t("catalog.modelCategory.otherTypes", vars)}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={c.count >= MIN_MODEL_CATEGORY_PARTS ? `${base}/${c.slug}` : `${base}#cat-${c.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-re border border-re-steel-200 px-3 text-[0.9375rem] hover:border-re-ink"
                  >
                    {c.name}
                    <span className="re-mono text-[0.8125rem] text-re-steel-600">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}
