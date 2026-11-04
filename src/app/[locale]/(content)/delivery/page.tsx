import type { Metadata } from "next";
import { Banknote, FileText, Truck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap } from "@/lib/api/site";
import { ContentPage, contentMetadata, Prose } from "@/components/content/ContentPage";
import { Inline } from "@/components/content/RichText";
import { WhatsAppLink } from "@/components/catalog/WhatsAppLink";
import { buttonClass } from "@/components/ui/button-styles";

type Props = PageProps<"/[locale]/delivery">;

type Row = { area: string; how: string; timing: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "delivery" });
  return contentMetadata(locale, "/delivery", t("title"), t("metaDescription"));
}

/**
 * Delivery areas, payment and VAT invoice info. All copy is draft placeholder
 * text in messages (`delivery.*`) for the client to edit — timings are
 * phrased as "ask us", never promised.
 */
export default async function DeliveryPage({ params }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const rows = t.raw("delivery.areas.rows") as Row[];
  const payment = t.raw("delivery.payment.items") as string[];
  const vat = t.raw("delivery.vat.items") as string[];
  const wa = boot.settings.whatsappNumber || boot.settings.contactPhone;

  return (
    <ContentPage
      locale={locale}
      href="/delivery"
      crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("delivery.title") }]}
      eyebrow={t("delivery.eyebrow")}
      title={t("delivery.heading")}
      lead={<p>{t("delivery.lead")}</p>}
    >
      <section aria-labelledby="areas">
        <h2 id="areas" className="flex items-center gap-2 text-[1.375rem] font-bold">
          <Truck aria-hidden className="size-6" strokeWidth={1.5} />
          {t("delivery.areas.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-re-steel-600">{t("delivery.areas.lead")}</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-[0.9375rem]">
            <thead>
              <tr className="border-y border-re-ink text-left">
                <th scope="col" className="py-2.5 pr-4 font-semibold">{t("delivery.areas.colArea")}</th>
                <th scope="col" className="py-2.5 pr-4 font-semibold">{t("delivery.areas.colHow")}</th>
                <th scope="col" className="py-2.5 font-semibold">{t("delivery.areas.colTiming")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-re-steel-200">
              {rows.map((r) => (
                <tr key={r.area}>
                  <th scope="row" className="py-3 pr-4 text-left align-top font-semibold">{r.area}</th>
                  <td className="py-3 pr-4 align-top">{r.how}</td>
                  <td className="py-3 align-top text-re-steel-600">{r.timing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.8125rem] text-re-steel-600">{t("delivery.areas.note")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <WhatsAppLink number={wa} text={t("delivery.waText")}>
            {t("delivery.askWhatsapp")}
          </WhatsAppLink>
          <Link href="/policies/shipping" className={buttonClass({ variant: "secondary" })}>
            {t("delivery.shippingPolicy")}
          </Link>
        </div>
      </section>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="payment" className="relative border-t border-re-ink pt-5">
          <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
          <h2 id="payment" className="flex items-center gap-2 text-[1.25rem] font-bold">
            <Banknote aria-hidden className="size-5" strokeWidth={1.5} />
            {t("delivery.payment.title")}
          </h2>
          <Prose className="[&_ul]:mt-3 text-[1rem]">
            <ul>
              {payment.map((p, i) => (
                <li key={i}>
                  <Inline text={p} />
                </li>
              ))}
            </ul>
          </Prose>
        </section>
        <section aria-labelledby="vat" className="relative border-t border-re-ink pt-5">
          <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
          <h2 id="vat" className="flex items-center gap-2 text-[1.25rem] font-bold">
            <FileText aria-hidden className="size-5" strokeWidth={1.5} />
            {t("delivery.vat.title")}
          </h2>
          <Prose className="[&_ul]:mt-3 text-[1rem]">
            <ul>
              {vat.map((p, i) => (
                <li key={i}>
                  <Inline text={p} />
                </li>
              ))}
            </ul>
          </Prose>
        </section>
      </div>

      <div className="mt-14 border border-re-ink p-5 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <p className="font-semibold">{t("delivery.ctaTitle")}</p>
          <p className="mt-1 text-[0.9375rem] text-re-steel-600">{t("delivery.ctaBody")}</p>
        </div>
        <Link href="/rfq" className={buttonClass({ variant: "primary" }, "mt-4 md:mt-0")}>
          {t("nav.rfqLong")}
        </Link>
      </div>
    </ContentPage>
  );
}
