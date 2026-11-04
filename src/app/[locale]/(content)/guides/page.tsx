import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { GUIDES } from "@/content/guides";
import { itemList } from "@/lib/seo/jsonld";
import { localeUrl } from "@/lib/seo/metadata";
import { ContentPage, contentMetadata } from "@/components/content/ContentPage";

type Props = PageProps<"/[locale]/guides">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "guides" });
  return contentMetadata(locale, "/guides", t("title"), t("metaDescription"));
}

export default async function GuidesPage({ params }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const list = GUIDES.map((g) => ({ g, body: g[locale] }));
  return (
    <ContentPage
      locale={locale}
      href="/guides"
      crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("guides.title") }]}
      eyebrow={t("guides.eyebrow")}
      title={t("guides.heading")}
      lead={<p>{t("guides.lead")}</p>}
      jsonLd={[itemList(list.map(({ g, body }) => ({ name: body.title, url: localeUrl(`/guides/${g.slug}`, locale) })), t("guides.title"))]}
    >
      <ol className="divide-y divide-re-steel-200 border-y border-re-ink">
        {list.map(({ g, body }, i) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group grid gap-x-6 gap-y-2 py-6 md:grid-cols-[4rem_minmax(0,1fr)_auto] md:items-start">
              <span className="re-mono text-sm font-semibold text-re-red-text">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="re-label">{g.tag}</span>
                <span className="mt-1 block text-[1.25rem] leading-snug font-bold group-hover:text-re-blue sm:text-[1.5rem]">{body.title}</span>
                <span className="mt-2 block max-w-2xl text-re-steel-600">{body.description}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-re-blue">
                {t("guides.read")}
                <ArrowRight aria-hidden className="size-4 transition-transform duration-150 ease-re group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-2xl text-[0.9375rem] text-re-steel-600">
        {t("guides.askTopic")}{" "}
        <Link href="/contact" className="font-semibold text-re-blue hover:underline">
          {t("guides.askLink")}
        </Link>
      </p>
    </ContentPage>
  );
}
