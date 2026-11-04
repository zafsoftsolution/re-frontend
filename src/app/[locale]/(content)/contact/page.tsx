import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap } from "@/lib/api/site";
import { telHref, whatsappHref } from "@/lib/format";
import { localeUrl } from "@/lib/seo/metadata";
import { WhatsAppIcon } from "@/components/icons/brand";
import { buttonClass } from "@/components/ui/button-styles";
import { ContentPage, contentMetadata } from "@/components/content/ContentPage";
import { ContactForm } from "@/components/content/ContactForm";
import { IntlScope } from "@/components/content/IntlScope";

type Props = PageProps<"/[locale]/contact">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "contact" });
  return contentMetadata(locale, "/contact", t("title"), t("metaDescription"));
}

const HOURS = ["satThu", "fri"] as const;

export default async function ContactPage({ params }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const s = boot.settings;
  const tel = telHref(s.contactPhone);
  const waNumber = s.whatsappNumber || s.contactPhone;
  const wa = whatsappHref(waNumber, t("contact.waText"));
  const address = s.businessAddress.trim();
  const mapQuery = encodeURIComponent(address);

  const rows = [
    tel && { icon: <Phone aria-hidden className="size-5" strokeWidth={1.75} />, label: t("contact.phone"), value: <a href={tel} className="re-mono text-[1.25rem] font-semibold hover:text-re-blue">{s.contactPhone}</a>, note: t("contact.phoneNote") },
    wa && { icon: <WhatsAppIcon className="size-5 text-re-whatsapp" />, label: t("contact.whatsapp"), value: <a href={wa} target="_blank" rel="noopener" className="re-mono text-[1.25rem] font-semibold hover:text-re-whatsapp">{waNumber}</a>, note: t("contact.whatsappNote") },
    s.contactEmail && { icon: <Mail aria-hidden className="size-5" strokeWidth={1.75} />, label: t("contact.email"), value: <a href={`mailto:${s.contactEmail}`} className="text-[1.0625rem] font-semibold break-all hover:text-re-blue">{s.contactEmail}</a>, note: t("contact.emailNote") },
    address && { icon: <MapPin aria-hidden className="size-5" strokeWidth={1.75} />, label: t("contact.address"), value: <address className="text-[1.0625rem] not-italic whitespace-pre-line">{address}</address>, note: "" },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: React.ReactNode; note: string }[];

  return (
    <ContentPage
      locale={locale}
      href="/contact"
      crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("contact.title") }]}
      eyebrow={t("contact.eyebrow")}
      title={t("contact.heading")}
      lead={<p>{t("contact.lead")}</p>}
      jsonLd={[{ "@context": "https://schema.org", "@type": "ContactPage", name: t("contact.title"), url: localeUrl("/contact", locale), inLanguage: locale }]}
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          {rows.length > 0 ? (
            <dl className="divide-y divide-re-steel-200 border-y border-re-ink">
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                  <span className="pt-0.5 text-re-steel-600">{r.icon}</span>
                  <div className="min-w-0">
                    <dt className="re-label">{r.label}</dt>
                    <dd className="mt-1">{r.value}</dd>
                    {r.note && <dd className="mt-1 text-[0.875rem] text-re-steel-600">{r.note}</dd>}
                  </div>
                </div>
              ))}
            </dl>
          ) : (
            <p className="border-l-[3px] border-re-steel-200 pl-3 text-re-steel-600">{t("contact.noDetails")}</p>
          )}

          <div className="mt-8">
            <h2 className="re-label flex items-center gap-2">
              <Clock aria-hidden className="size-4" strokeWidth={1.75} />
              {t("contact.hoursTitle")}
            </h2>
            <dl className="mt-3 space-y-1.5 text-[0.9375rem]">
              {HOURS.map((h) => (
                <div key={h} className="flex justify-between gap-4 border-b border-dashed border-re-steel-200 pb-1.5">
                  <dt>{t(`contact.hours.${h}.days`)}</dt>
                  <dd className="re-mono">{t(`contact.hours.${h}.time`)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[0.8125rem] text-re-steel-600">{t("contact.hoursNote")}</p>
          </div>

          {address && (
            <div className="mt-8">
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary" })}>
                <MapPin aria-hidden />
                {t("contact.openMap")}
              </a>
              {/* Closed by default: the third-party map only loads when asked for (no JS needed). */}
              <details className="mt-3 border border-re-steel-200">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-[0.9375rem] font-semibold">{t("contact.showMap")}</summary>
                <iframe
                  title={t("contact.mapTitle")}
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block aspect-[4/3] w-full border-0"
                />
              </details>
            </div>
          )}

          <div className="mt-8 border border-re-steel-200 bg-re-steel-50 p-4 text-[0.9375rem]">
            <p className="font-semibold">{t("contact.quoteTitle")}</p>
            <p className="mt-1 text-re-steel-600">{t("contact.quoteBody")}</p>
            <Link href="/rfq" className={buttonClass({ variant: "primary", size: "sm" }, "mt-3")}>
              {t("nav.rfqLong")}
            </Link>
          </div>
        </div>

        <section aria-labelledby="contact-form" className="relative border-t border-re-ink pt-5">
          <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
          <h2 id="contact-form" className="text-[1.375rem] font-bold">
            {t("contact.formTitle")}
          </h2>
          <p className="mt-1 mb-6 text-[0.9375rem] text-re-steel-600">{t("contact.formLead")}</p>
          <IntlScope namespaces={["contact"]}>
            <ContactForm />
          </IntlScope>
        </section>
      </div>
    </ContentPage>
  );
}
