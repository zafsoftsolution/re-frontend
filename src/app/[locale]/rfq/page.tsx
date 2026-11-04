import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { getBootstrap } from "@/lib/api/site";
import { catalogMetadata } from "@/lib/seo/metadata";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { RfqForm } from "@/components/rfq/RfqForm";
import { ContactLine } from "@/components/content/BusinessFacts";

export async function generateMetadata({ params }: PageProps<"/[locale]/rfq">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  return catalogMetadata({
    locale,
    href: "/rfq",
    title: t("rfq.metaTitle"),
    description: t("rfq.metaDescription"),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

/** Static shell; the quote list hydrates from localStorage in RfqForm. */
export default async function RfqPage({ params }: PageProps<"/[locale]/rfq">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  return (
    <>
      <SheetHeader
        crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("rfq.title") }]}
        eyebrow={t("rfq.eyebrow")}
        title={t("rfq.heading")}
        lead={
          <>
            <p>{t("rfq.lead")}</p>
            <ContactLine settings={boot.settings} reply className="mt-3" />
          </>
        }
        metaClassName="max-md:hidden"
        meta={[
          { label: t("rfq.meta.reply"), value: t("rfq.meta.replyValue") },
          { label: t("rfq.meta.files"), value: "XLSX · CSV · PDF · JPG" },
          { label: t("rfq.meta.login"), value: t("rfq.meta.loginValue") },
        ]}
      />
      <div className="re-shell pb-8">
        <RfqForm whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone} />
      </div>
    </>
  );
}
