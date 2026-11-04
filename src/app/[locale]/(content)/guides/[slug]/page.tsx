import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { GUIDES, getGuide } from "@/content/guides";
import { absoluteUrl } from "@/lib/seo/jsonld";
import { localeUrl } from "@/lib/seo/metadata";
import { formatDate } from "@/components/content/dates";
import { ContentPage, contentMetadata, Prose } from "@/components/content/ContentPage";
import { GuideBlocks } from "@/components/content/RichText";
import { buttonClass } from "@/components/ui/button-styles";

type Props = PageProps<"/[locale]/guides/[slug]">;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => GUIDES.map((g) => ({ locale, slug: g.slug })));
}

async function load(params: Props["params"]) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  return { locale, guide, body: guide[locale] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, guide, body } = await load(params);
  const meta = await contentMetadata(locale, `/guides/${guide.slug}`, body.title, body.description);
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", publishedTime: guide.published, modifiedTime: guide.updated } };
}

export default async function GuidePage({ params }: Props) {
  const { locale, guide, body } = await load(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const href = `/guides/${guide.slug}`;
  const toc = body.blocks.filter((b) => b.t === "h2");
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: body.title,
    description: body.description,
    inLanguage: locale,
    datePublished: guide.published,
    dateModified: guide.updated,
    mainEntityOfPage: localeUrl(href, locale),
    image: absoluteUrl("/opengraph-image.png"),
    author: { "@type": "Organization", name: "Rakib Enterprise", url: absoluteUrl("/") },
    publisher: { "@type": "Organization", name: "Rakib Enterprise", logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") } },
  };

  return (
    <ContentPage
      locale={locale}
      href={href}
      crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("guides.title"), href: "/guides" }, { label: body.title }]}
      eyebrow={guide.tag}
      title={body.title}
      lead={<p>{body.description}</p>}
      meta={[{ label: t("guides.updated"), value: formatDate(guide.updated, locale) }]}
      jsonLd={[article]}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
        <article>
          <Prose>
            <GuideBlocks blocks={body.blocks} />
          </Prose>
          <div className="mt-12 max-w-[68ch] border border-re-ink p-5">
            <p className="font-semibold">{t("guides.ctaTitle")}</p>
            <p className="mt-1 text-[0.9375rem] text-re-steel-600">{t("guides.ctaBody")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/rfq" className={buttonClass({ variant: "primary" })}>
                {t("nav.rfqLong")}
              </Link>
              <Link href="/search" className={buttonClass({ variant: "secondary" })}>
                {t("guides.searchParts")}
              </Link>
            </div>
          </div>
        </article>
        <aside className="order-first lg:order-none">
          <div className="lg:sticky lg:top-24">
            {toc.length > 1 && (
              <nav aria-label={t("guides.toc")}>
                <p className="re-label">{t("guides.toc")}</p>
                <ol className="mt-2 space-y-1 border-l border-re-steel-200 text-[0.9375rem]">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="-ml-px block border-l border-transparent py-1 pl-3 hover:border-re-ink hover:text-re-blue">
                        {h.text.replace(/[*`]/g, "")}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {others.length > 0 && (
              <div className="mt-8 hidden lg:block">
                <p className="re-label">{t("guides.more")}</p>
                <ul className="mt-2 space-y-2 text-[0.9375rem]">
                  {others.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/guides/${g.slug}`} className="font-semibold hover:text-re-blue hover:underline">
                        {g[locale].title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </ContentPage>
  );
}
