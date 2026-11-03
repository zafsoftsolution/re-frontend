import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/params";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getBootstrap } from "@/lib/api/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuoteListView } from "@/components/rfq/QuoteListView";

export async function generateMetadata({ params }: PageProps<"/[locale]/rfq">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "rfq" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function RfqPage({ params }: PageProps<"/[locale]/rfq">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations(), getBootstrap(locale)]);
  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("rfq.title") }]} />
      <SectionHeader as="h1" title={t("rfq.title")} subtitle={t("rfq.lead")} className="mt-4" />
      <QuoteListView whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone} />
    </div>
  );
}
