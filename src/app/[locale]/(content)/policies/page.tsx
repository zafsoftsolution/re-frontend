import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { POLICY_SLUGS } from "@/content/slugs";
import { ContentPage, contentMetadata } from "@/components/content/ContentPage";

type Props = PageProps<"/[locale]/policies">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "policies" });
  return contentMetadata(locale, "/policies", t("title"), t("metaDescription"));
}

export default async function PoliciesIndex({ params }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return (
    <ContentPage
      locale={locale}
      href="/policies"
      crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("policies.title") }]}
      eyebrow={t("policies.eyebrow")}
      title={t("policies.title")}
      lead={<p>{t("policies.lead")}</p>}
    >
      <ul className="grid max-w-4xl divide-y divide-re-steel-200 border-y border-re-ink">
        {POLICY_SLUGS.map((p) => (
          <li key={p}>
            <Link href={`/policies/${p}`} className="group flex items-start justify-between gap-6 py-5">
              <span>
                <span className="block text-[1.125rem] font-bold group-hover:text-re-blue">{t(`policies.items.${p}.title`)}</span>
                <span className="mt-1 block text-[0.9375rem] text-re-steel-600">{t(`policies.items.${p}.summary`)}</span>
              </span>
              <ArrowRight aria-hidden className="mt-1 size-5 shrink-0 text-re-blue" />
            </Link>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
