import type { Metadata } from "next";
import { Info, Megaphone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap, getMachineModels } from "@/lib/api/site";
import type { CategorySummary } from "@/lib/api/types";
import { telHref, whatsappHref } from "@/lib/format";
import { catalogMetadata, localePath, localeUrl } from "@/lib/seo/metadata";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/catalog/JsonLd";
import type { PickerBrand } from "@/components/catalog/MachinePicker";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid, FeaturedParts, MachineBrandTiles, QuickCategories, QuoteSteps, TrustFacts, pickCategories } from "@/components/home/HomeSections";
import { PartsBookScene, type FigureItem } from "@/components/home/PartsBookScene";
import { FIGURE_PARTS, type FigurePart } from "@/components/home/HookAssemblyFigure";
import { getHomeContent } from "@/components/home/content";
import { exampleNumbers, getHomeParts } from "@/components/home/data";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, boot] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getBootstrap(locale)]);
  // The home title already carries the brand: no template, same OG title.
  return catalogMetadata({
    locale,
    href: "/",
    title: t("title"),
    seoTitle: t("title"),
    description: t("description"),
    siteName: boot.settings.siteName || t("siteName"),
  });
}

/** Which category each numbered part of the drawing opens. */
const PART_CATEGORY: Record<FigurePart, RegExp[]> = {
  hook: [/rotary.*hook|hook/],
  bobbinCase: [/bobbin.*case/, /bobbin/, /hook/],
  bobbin: [/^bobbins?$/, /bobbin/],
  feedDog: [/feed/],
  presserFoot: [/presser|feet|foot/],
  needle: [/^needles?$/, /needle(?!.*plate)/],
};

function categoryFor(key: FigurePart, cats: CategorySummary[]): CategorySummary | null {
  for (const re of PART_CATEGORY[key]) {
    const hit = cats.find((c) => re.test(c.slug) || re.test(c.name.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

/**
 * Home — search-first hero, the "machine → part" exploded drawing (the one
 * scroll scene), brands, part types, featured parts, how quoting works and
 * plain trust facts. Section copy comes from the admin's HomeBlocks when set
 * (components/home/content.ts), else from messages.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot, models, homeParts, content] = await Promise.all([
    getTranslations(),
    getBootstrap(locale),
    getMachineModels(locale),
    getHomeParts(locale),
    getHomeContent(locale),
  ]);
  const { settings } = boot;
  const wa = whatsappHref(settings.whatsappNumber || settings.contactPhone, t("ui.askWhatsapp"));
  const tel = telHref(settings.contactPhone);

  const parts = content.parts?.picked.length ? content.parts.picked.slice(0, 8) : homeParts;
  const examples = exampleNumbers([...parts, ...homeParts]);

  const picker: PickerBrand[] = [...boot.machineBrands]
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      models: models
        .filter((m) => m.brandSlug === b.slug)
        .sort((x, y) => x.name.localeCompare(y.name, "en", { numeric: true }))
        .map((m) => ({ slug: m.slug, name: m.name })),
    }));

  const figure: FigureItem[] = FIGURE_PARTS.map((key) => {
    const cat = categoryFor(key, boot.categories);
    return {
      key,
      name: t(`home.scene.parts.${key}`),
      note: t(`home.scene.notes.${key}`),
      href: cat ? `/categories/${cat.slug}` : { pathname: "/search", query: { q: t(`home.scene.search.${key}`) } },
      meta: cat ? t("home.scene.count", { count: cat.productCount }) : t("home.scene.browse"),
    };
  });

  const announcement = content.announcement?.body || content.announcement?.title;
  const homeCategories = pickCategories(boot.categories, content.categories?.categoryIds);

  return (
    <>
      <JsonLd
        data={websiteJsonLd({
          name: settings.siteName || t("meta.siteName"),
          url: localeUrl("/", locale),
          searchUrl: localeUrl("/search", locale),
          locale,
        })}
      />
      {announcement && (
        <div className="border-b border-re-steel-200 bg-re-paper">
          <p className="re-shell flex min-h-10 items-center gap-2.5 py-2 text-[0.875rem] text-re-ink">
            <Megaphone aria-hidden className="size-4 shrink-0 text-re-red" strokeWidth={1.75} />
            <span className="min-w-0">{announcement}</span>
            {content.announcement?.cta && (
              <Link href={content.announcement.cta.href} className="ml-auto shrink-0 font-semibold text-re-blue hover:underline">
                {content.announcement.cta.label}
              </Link>
            )}
          </p>
        </div>
      )}

      <Hero
        copy={content.hero}
        examples={examples}
        picker={picker.some((b) => b.models.length > 0) ? picker.filter((b) => b.models.length > 0) : picker}
        paths={{
          search: localePath("/search", locale),
          find: localePath("/machines/find", locale),
          machines: localePath("/machines", locale),
        }}
        phone={settings.contactPhone}
        tel={tel}
        whatsapp={wa}
        quick={<QuickCategories categories={homeCategories} copy={content.categories} />}
      />

      {/* Phones: featured parts as a swipe strip right after the hero (the
          desktop table stays in its place below). */}
      <FeaturedParts index="" parts={parts} copy={content.parts} id="home-featured-m" className="lg:hidden" />

      {!boot.live && (
        <p className="re-shell mt-6 flex items-center gap-2 text-[0.875rem] text-re-blue">
          <Info aria-hidden className="size-4 shrink-0" />
          {t("home.offline")}
        </p>
      )}

      <PartsBookScene
        items={figure}
        labels={{
          index: "01",
          title: t("home.scene.title"),
          lead: t("home.scene.lead"),
          figTitle: t("home.scene.figTitle"),
          figSub: t("home.scene.figSub"),
          figAria: t("home.scene.figAria"),
          scale: t("home.scene.scale"),
          step: t("home.scene.step"),
          listLabel: t("home.scene.listLabel"),
        }}
      />

      <MachineBrandTiles index="02" brands={boot.machineBrands} copy={content.machineBrands} />
      <CategoryGrid index="03" categories={homeCategories} copy={content.categories} className="max-lg:hidden" />
      <FeaturedParts index="04" parts={parts} copy={content.parts} className="max-lg:hidden" />
      <QuoteSteps index="05" copy={content.rfq} whatsappHref={wa} />
      <TrustFacts index="06" settings={settings} tel={tel} />
    </>
  );
}
