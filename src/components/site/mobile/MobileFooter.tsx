import { ArrowUpRight, Clock, MapPin, Phone, PhoneCall } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { useHoursShort } from "@/components/content/BusinessFacts";
import { BUSINESS, businessLocale, mapsSearchUrl } from "@/config/business";
import type { SiteSettings } from "@/lib/api/types";
import { telHref, whatsappHref } from "@/lib/format";
import { DEVICES_HREF } from "../nav";
import { FooterAccordion, type FooterLink } from "./FooterAccordion";
import { LocaleSegmented } from "./LocaleSegmented";

const POLICIES = ["shipping", "returns", "payment", "privacy", "terms"] as const;

/**
 * Phone footer (below md) — app-style instead of the desktop's columns:
 * contact card (sales centre + map, tap-to-call both numbers, WhatsApp,
 * hours) · three closed accordions · payment chips · registration row ·
 * language · ©. Server-rendered; the accordions are native <details>.
 */
export function MobileFooter({ settings, year, showDevices }: { settings: SiteSettings; year: number; showDevices: boolean }) {
  const t = useTranslations();
  const l = businessLocale(useLocale());
  const hours = useHoursShort();
  const tel = telHref(settings.contactPhone);
  const tel2 = telHref(settings.contactPhoneSecondary ?? "");
  const wa = whatsappHref(settings.whatsappNumber || settings.contactPhone);
  const address = settings.businessAddress || BUSINESS.salesCentre.address[l];
  const payments = t("footer.paymentMethods").split(/\s*·\s*/).filter(Boolean);

  const sections: { id: string; title: string; links: FooterLink[] }[] = [
    {
      id: "ft-parts",
      title: t("footer.partsHeading"),
      links: [
        { href: "/categories", label: t("nav.parts") },
        ...(showDevices ? [{ href: DEVICES_HREF, label: t("nav.devices") }] : []),
        { href: "/machines", label: t("nav.byMachine") },
        { href: "/brands", label: t("nav.brands") },
        { href: "/guides", label: t("nav.guides") },
        { href: "/rfq", label: t("nav.rfqLong"), strong: true },
      ],
    },
    {
      id: "ft-company",
      title: t("footer.companyHeading"),
      links: [
        { href: "/about", label: t("footer.about_link") },
        { href: "/contact", label: t("nav.contact") },
        { href: "/delivery", label: t("footer.delivery") },
      ],
    },
    {
      id: "ft-policies",
      title: t("footer.policiesHeading"),
      links: POLICIES.map((p) => ({ href: `/policies/${p}`, label: t(`footer.${p}`) })),
    },
  ];

  const tile = "flex min-h-14 min-w-0 items-center gap-2.5 border border-white/15 px-3 py-2 active:bg-white/10";

  return (
    <div className="re-shell pt-8 pb-6 md:hidden">
      <p className="text-[1.375rem] leading-none font-extrabold tracking-[0.02em] text-white [font-stretch:78%]">RAKIB ENTERPRISE</p>
      <p className="mt-2 text-[0.875rem] text-white/65">
        {t("business.experience")} · {t("business.area")}
      </p>

      {/* Contact card */}
      <section aria-labelledby="ft-visit" className="mt-6 border border-white/15 border-t-[3px] border-t-re-red">
        <div className="p-4">
          <h2 id="ft-visit" className="re-label !text-white/60">
            {BUSINESS.salesCentre.name[l]} · {t("business.salesCentreTag")}
          </h2>
          <address className="mt-2 text-[0.9375rem] leading-relaxed text-white not-italic">{address}</address>
          <a
            href={mapsSearchUrl(address)}
            target="_blank"
            rel="noopener"
            className="mt-1 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-white underline decoration-white/35 underline-offset-4"
          >
            <MapPin aria-hidden className="size-4 text-white/60" strokeWidth={1.75} />
            {t("business.openMap")}
            <ArrowUpRight aria-hidden className="size-4 text-white/60" strokeWidth={1.75} />
          </a>
        </div>
        <div className="grid gap-2 px-4">
          {tel && (
            <a href={tel} className={tile}>
              <Phone aria-hidden className="size-5 shrink-0 text-white/70" strokeWidth={1.75} />
              <span className="min-w-0">
                <span className="block text-[0.75rem] text-white/60">{t("business.mobile")}</span>
                <span className="re-mono block text-[1rem] font-semibold text-white">{settings.contactPhone}</span>
              </span>
            </a>
          )}
          {tel2 && (
            <a href={tel2} className={tile}>
              <PhoneCall aria-hidden className="size-5 shrink-0 text-white/70" strokeWidth={1.75} />
              <span className="min-w-0">
                <span className="block text-[0.75rem] text-white/60">{t("business.landline")}</span>
                <span className="re-mono block text-[1rem] font-semibold text-white">{settings.contactPhoneSecondary}</span>
              </span>
            </a>
          )}
        </div>
        {wa && (
          <div className="px-4 pt-2">
            <a
              href={wa}
              target="_blank"
              rel="noopener"
              className="flex h-12 items-center justify-center gap-2 bg-re-whatsapp px-4 font-semibold text-white active:bg-re-whatsapp-dark"
            >
              <WhatsAppIcon className="size-5" />
              {t("footer.whatsappCta")}
            </a>
          </div>
        )}
        <p className="flex items-start gap-2.5 p-4 text-[0.875rem] text-white/80">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-white/55" strokeWidth={1.75} />
          {hours}
        </p>
      </section>

      <div className="mt-6 border-t border-white/12">
        {sections.map((s) => (
          <FooterAccordion
            key={s.id}
            id={s.id}
            title={s.title}
            links={s.links}
            renderLink={(link, className) => (
              <Link href={link.href} className={className}>
                {link.label}
              </Link>
            )}
          />
        ))}
      </div>

      <section aria-labelledby="ft-pay" className="mt-6">
        <h2 id="ft-pay" className="re-label !text-white/60">
          {t("footer.paymentHeading")}
        </h2>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {payments.map((p) => (
            <li key={p} className="inline-flex h-8 items-center border border-white/20 px-2.5 text-[0.8125rem] font-semibold text-white">
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* Registration, spec-sheet style. */}
      <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-white/12 pt-4 text-[0.75rem]">
        <dt className="text-white/60">{t("business.bin")}</dt>
        <dd className="re-mono text-white/85">{BUSINESS.vatBin}</dd>
        <dt className="text-white/60">{t("business.tradeLicence")}</dt>
        <dd className="re-mono [overflow-wrap:anywhere] text-white/85">
          {BUSINESS.tradeLicence.number} · {BUSINESS.tradeLicence.authorityShort}
        </dd>
      </dl>

      <div className="mt-6">
        <LocaleSegmented tone="dark" label={t("nav.language")} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.75rem] text-white/60">
        <p>{t("footer.rights", { year })}</p>
        <p className="re-mono">rakibenterprise-bd.com</p>
      </div>
    </div>
  );
}
