import type { Metadata } from "next";
import { Building2, Clock, Mail, MapPin, Phone, Store } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap } from "@/lib/api/site";
import type { SiteSettings } from "@/lib/api/types";
import { telHref, whatsappHref } from "@/lib/format";
import { localeUrl } from "@/lib/seo/metadata";
import { BUSINESS, businessLocale, mapsSearchUrl } from "@/config/business";
import { WhatsAppIcon } from "@/components/icons/brand";
import { buttonClass } from "@/components/ui/button-styles";
import { ContentPage, contentMetadata } from "@/components/content/ContentPage";
import { ContactForm } from "@/components/content/ContactForm";
import { IntlScope } from "@/components/content/IntlScope";
import { HoursTable, RegistrationLines, SisterConcernNote } from "@/components/content/BusinessFacts";

type Props = PageProps<"/[locale]/contact">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "contact" });
  return contentMetadata(locale, "/contact", t("title"), t("metaDescription"));
}

type T = Awaited<ReturnType<typeof getTranslations>>;

/** Phones: the two things people come here for, as big tap targets. */
function QuickContact({ t, settings: s }: { t: T; settings: SiteSettings }) {
  const tel = telHref(s.contactPhone);
  const waNumber = s.whatsappNumber || s.contactPhone;
  const wa = whatsappHref(waNumber, t("contact.waText"));
  if (!tel && !wa) return null;
  const card = "flex min-h-24 flex-col justify-between gap-2 border p-3 active:opacity-90";
  return (
    <div className="-mt-2 mb-8 grid grid-cols-2 gap-3 lg:hidden">
      {wa && (
        <a href={wa} target="_blank" rel="noopener" className={`${card} border-re-whatsapp bg-re-whatsapp text-white`}>
          <WhatsAppIcon className="size-6" />
          <span>
            <span className="block font-semibold">{t("business.whatsapp")}</span>
            <span className="re-mono block text-[0.8125rem] opacity-90">{waNumber}</span>
          </span>
        </a>
      )}
      {tel && (
        <a href={tel} className={`${card} border-re-ink bg-re-paper text-re-ink`}>
          <Phone aria-hidden className="size-6" strokeWidth={1.75} />
          <span>
            <span className="block font-semibold">{t("catalog.listing.emptyCall")}</span>
            <span className="re-mono block text-[0.8125rem] text-re-steel-600">{s.contactPhone}</span>
          </span>
        </a>
      )}
    </div>
  );
}

/**
 * Contact — two location cards (the walk-in sales centre first, then the
 * corporate office), each with phones, WhatsApp, email and hours; then
 * registration (BIN, trade licence) and the sister concern. Phones, email and
 * the sales-centre address come from admin settings (defaults: config/business).
 */
export default async function ContactPage({ params }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const s = boot.settings;
  const l = businessLocale(locale);
  const salesAddress = s.businessAddress.trim();

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
      <QuickContact t={t} settings={s} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <section aria-labelledby="contact-locations">
          <h2 id="contact-locations" className="sr-only">
            {t("contact.locationsTitle")}
          </h2>
          <div className="space-y-6">
            <LocationCard
              t={t}
              settings={s}
              icon={<Store aria-hidden className="size-5" strokeWidth={1.75} />}
              name={BUSINESS.salesCentre.name[l]}
              tag={t("business.salesCentreTag")}
              address={salesAddress}
              primary
              map
            />
            <LocationCard
              t={t}
              settings={s}
              icon={<Building2 aria-hidden className="size-5" strokeWidth={1.75} />}
              name={BUSINESS.corporateOffice.name[l]}
              tag={t("business.corporateTag")}
              address={BUSINESS.corporateOffice.address[l]}
            />
          </div>

          <div className="mt-6 border border-re-steel-200 p-4 text-[0.9375rem]">
            <p className="re-label">{t("business.registration")}</p>
            <RegistrationLines className="mt-2 text-re-ink" />
            <SisterConcernNote className="mt-3 border-t border-dashed border-re-steel-200 pt-3 text-[0.875rem] text-re-steel-600" />
          </div>

          <div className="mt-6 border border-re-steel-200 bg-re-steel-50 p-4 text-[0.9375rem]">
            <p className="font-semibold">{t("contact.quoteTitle")}</p>
            <p className="mt-1 text-re-steel-600">{t("contact.quoteBody")}</p>
            <Link href="/rfq" className={buttonClass({ variant: "primary", size: "sm" }, "mt-3 max-md:h-11 max-md:w-full max-md:text-sm")}>
              {t("nav.rfqLong")}
            </Link>
          </div>
        </section>

        <section aria-labelledby="contact-form" className="relative self-start border-t border-re-ink pt-5">
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

function LocationCard({
  t,
  settings: s,
  icon,
  name,
  tag,
  address,
  primary = false,
  map = false,
}: {
  t: T;
  settings: SiteSettings;
  icon: React.ReactNode;
  name: string;
  tag: string;
  address: string;
  primary?: boolean;
  map?: boolean;
}) {
  const tel = telHref(s.contactPhone);
  const tel2 = telHref(s.contactPhoneSecondary ?? "");
  const waNumber = s.whatsappNumber || s.contactPhone;
  const wa = whatsappHref(waNumber, t("contact.waText"));
  const mapUrl = address ? mapsSearchUrl(address) : "";
  const row = "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-b border-re-steel-200 py-3 last:border-b-0";
  const value = "re-mono inline-flex min-h-11 items-center text-[1.0625rem] font-semibold hover:text-re-blue md:inline md:min-h-0";

  return (
    <article className={primary ? "relative border border-re-ink" : "relative border border-re-steel-200"}>
      {primary && <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-re-steel-200 px-4 py-3">
        <h3 className="flex items-center gap-2 text-[1.125rem] font-bold text-re-ink">
          <span className="text-re-steel-600">{icon}</span>
          {name}
        </h3>
        <span className={primary ? "re-label !text-re-red-text" : "re-label"}>{tag}</span>
      </header>

      <div className="px-4">
        {address && (
          <div className={row}>
            <MapPin aria-hidden className="mt-0.5 size-4 text-re-steel-600" strokeWidth={1.75} />
            <dl className="min-w-0">
              <dt className="sr-only">{t("business.address")}</dt>
              <dd>
                <address className="text-[1rem] not-italic">{address}</address>
                <a href={mapUrl} target="_blank" rel="noopener" className="mt-1 inline-flex min-h-11 items-center text-[0.875rem] font-semibold text-re-blue hover:underline md:min-h-9">
                  {t("business.openMap")}
                </a>
              </dd>
            </dl>
          </div>
        )}
        {tel && (
          <div className={row}>
            <Phone aria-hidden className="mt-1 size-4 text-re-steel-600" strokeWidth={1.75} />
            <dl className="min-w-0">
              <dt className="re-label">{t("business.mobile")}</dt>
              <dd className="mt-0.5">
                <a href={tel} className={value}>{s.contactPhone}</a>
              </dd>
              {primary && <dd className="mt-0.5 text-[0.8125rem] text-re-steel-600">{t("contact.phoneNote")}</dd>}
              {tel2 && (
                <>
                  <dt className="re-label mt-2">{t("business.landline")}</dt>
                  <dd className="mt-0.5">
                    <a href={tel2} className={value}>{s.contactPhoneSecondary}</a>
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
        {wa && (
          <div className={row}>
            <WhatsAppIcon className="mt-1 size-4 text-re-whatsapp" />
            <dl className="min-w-0">
              <dt className="re-label">{t("business.whatsapp")}</dt>
              <dd className="mt-0.5">
                <a href={wa} target="_blank" rel="noopener" className="re-mono inline-flex min-h-11 items-center text-[1.0625rem] font-semibold hover:text-re-whatsapp md:inline md:min-h-0">{waNumber}</a>
              </dd>
              {primary && <dd className="mt-0.5 text-[0.8125rem] text-re-steel-600">{t("contact.whatsappNote")}</dd>}
            </dl>
          </div>
        )}
        {s.contactEmail && (
          <div className={row}>
            <Mail aria-hidden className="mt-1 size-4 text-re-steel-600" strokeWidth={1.75} />
            <dl className="min-w-0">
              <dt className="re-label">{t("business.email")}</dt>
              <dd className="mt-0.5">
                <a href={`mailto:${s.contactEmail}`} className="inline-flex min-h-11 items-center text-[1rem] font-semibold break-all hover:text-re-blue md:inline md:min-h-0">{s.contactEmail}</a>
              </dd>
              {primary && <dd className="mt-0.5 text-[0.8125rem] text-re-steel-600">{t("contact.emailNote")}</dd>}
            </dl>
          </div>
        )}
        <div className={row}>
          <Clock aria-hidden className="mt-1 size-4 text-re-steel-600" strokeWidth={1.75} />
          <dl className="min-w-0">
            <dt className="re-label">{t("business.hours")}</dt>
            <dd className="mt-1.5">
              <HoursTable />
            </dd>
          </dl>
        </div>
      </div>

      {map && address && (
        <div className="border-t border-re-steel-200 p-4 pt-3">
          {/* Closed by default: the third-party map only loads when asked for (no JS needed). */}
          <details className="border border-re-steel-200">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-[0.9375rem] font-semibold">
              <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
              {t("contact.showMap")}
            </summary>
            <iframe
              title={t("contact.mapTitle")}
              src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block aspect-[4/3] w-full border-0"
            />
          </details>
        </div>
      )}
    </article>
  );
}
