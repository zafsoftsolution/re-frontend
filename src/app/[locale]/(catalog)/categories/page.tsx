import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap, getCategories } from "@/lib/api/site";
import { categoryTree } from "@/lib/catalog/categories";
import { breadcrumbJsonLd, joinList } from "@/lib/catalog/page";
import { catalogMetadata, localeUrl } from "@/lib/seo/metadata";
import { itemList } from "@/lib/seo/jsonld";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { JsonLd } from "@/components/catalog/JsonLd";
import { PART_ICONS, partIconFor } from "@/components/icons/parts";

export async function generateMetadata({ params }: PageProps<"/[locale]/categories">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, categories, boot] = await Promise.all([getTranslations({ locale }), getCategories(locale), getBootstrap(locale)]);
  const top = categoryTree(categories).sort((a, b) => b.total - a.total);
  return catalogMetadata({
    locale,
    href: "/categories",
    title: t("catalog.categories.title"),
    description: t("catalog.categories.metaDescription", { categories: joinList(top.map((c) => c.name), locale, 6) }),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

export default async function CategoriesPage({ params }: PageProps<"/[locale]/categories">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, categories] = await Promise.all([getTranslations({ locale }), getCategories(locale)]);
  const tree = categoryTree(categories);
  const total = categories.reduce((n, c) => n + c.productCount, 0);
  const crumbs = [{ label: t("nav.home"), href: "/" }, { label: t("catalog.categories.title") }];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, locale, "/categories"),
          itemList(
            tree.map((c) => ({ name: c.name, url: localeUrl(`/categories/${c.slug}`, locale) })),
            t("catalog.categories.title"),
          ),
        ]}
      />
      <SheetHeader
        crumbs={crumbs}
        eyebrow={t("catalog.categories.eyebrow")}
        title={t("catalog.categories.title")}
        lead={t("catalog.categories.lead")}
        meta={[
          { label: t("catalog.categories.types"), value: tree.length },
          { label: t("catalog.categories.partsTotal"), value: total },
        ]}
      />
      <div className="re-shell mt-10">
        {tree.length === 0 ? (
          <p className="text-re-steel-600">{t("catalog.categories.empty")}</p>
        ) : (
          <ol className="grid gap-px border border-re-steel-200 bg-re-steel-200 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map((c, i) => {
              const key = partIconFor(`${c.slug} ${c.name}`);
              const Icon = key ? PART_ICONS[key] : null;
              return (
                <li key={c.slug} className="flex flex-col bg-re-paper">
                  <Link
                    href={`/categories/${c.slug}`}
                    className="group grid flex-1 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 p-4 transition-colors duration-150 hover:bg-re-steel-50 sm:p-5"
                  >
                    <span className="relative grid size-14 place-items-center border border-re-steel-200 bg-re-paper text-re-ink group-hover:border-re-ink">
                      <span aria-hidden className="re-mono absolute top-0.5 left-1 text-[0.5625rem] text-re-steel-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {Icon ? <Icon aria-hidden className="size-8" /> : <span className="re-mono text-xs">—</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[1.125rem] leading-snug font-bold text-re-ink group-hover:text-re-red-text">{c.name}</span>
                      <span className="re-mono text-[0.8125rem] text-re-steel-600">{t("catalog.categories.count", { count: c.total })}</span>
                    </span>
                    <ArrowRight aria-hidden className="size-4 text-re-steel-400 group-hover:text-re-ink" />
                  </Link>
                  {c.children.length > 0 && (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 border-t border-re-steel-200 px-4 py-2.5 text-[0.875rem] sm:px-5">
                      <li className="re-label self-center">{t("catalog.categories.subtypes")}</li>
                      {c.children.map((ch) => (
                        <li key={ch.slug}>
                          <Link href={`/categories/${ch.slug}`} className="inline-flex min-h-8 items-center text-re-blue hover:underline">
                            {ch.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
