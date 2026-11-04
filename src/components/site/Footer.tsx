import { Clock, Mail, MapPin, Phone, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Swoosh, WhatsAppIcon } from "@/components/icons/brand";
import { buttonClass } from "@/components/ui/button-styles";
import type { SiteSettings } from "@/lib/api/types";
import { telHref, whatsappHref } from "@/lib/format";
import { BUSINESS } from "@/config/business";
import { useHoursShort } from "@/components/content/BusinessFacts";
import { PRIMARY_NAV } from "./nav";

const POLICIES = ["shipping", "returns", "payment", "privacy", "terms"] as const;

export function Footer({ settings, year, showDevices }: { settings: SiteSettings; year: number; showDevices: boolean }) {
  const t = useTranslations();
  const tel = telHref(settings.contactPhone);
  const tel2 = telHref(settings.contactPhoneSecondary ?? "");
  const wa = whatsappHref(settings.whatsappNumber || settings.contactPhone);
  const hours = useHoursShort();

  return (
    <footer className="re-pb-bottom-bar mt-20 bg-re-ink text-white/80">
      {/* The page's single swoosh. */}
      <Swoosh className="block h-6 w-full -translate-y-px bg-re-paper md:h-8" />

      <div className="re-shell grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="text-[1.375rem] font-extrabold tracking-[0.02em] text-white [font-stretch:78%]">
            RAKIB ENTERPRISE
          </p>
          <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed">{t("footer.about")}</p>
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp" }, "mt-6")}>
              <WhatsAppIcon />
              {t("footer.whatsappCta")}
            </a>
          )}
        </div>

        <div className="md:col-span-3">
          <h2 className="re-label !text-white/55">{t("footer.contactHeading")}</h2>
          <ul className="mt-4 space-y-1.5 text-[0.9375rem]">
            {tel && (
              <li>
                <a href={tel} className="inline-flex min-h-9 items-center gap-2.5 hover:text-white">
                  <Phone aria-hidden className="size-4 text-white/50" strokeWidth={1.75} />
                  <span className="re-mono">{settings.contactPhone}</span>
                  <span className="sr-only">({t("business.mobile")})</span>
                </a>
              </li>
            )}
            {tel2 && (
              <li>
                <a href={tel2} className="inline-flex min-h-9 items-center gap-2.5 hover:text-white">
                  <PhoneCall aria-hidden className="size-4 text-white/50" strokeWidth={1.75} />
                  <span className="re-mono">{settings.contactPhoneSecondary}</span>
                  <span className="text-[0.8125rem] text-white/50">{t("business.landline")}</span>
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-2.5 hover:text-white">
                  <WhatsAppIcon className="size-4 text-white/50" />
                  <span className="re-mono">{settings.whatsappNumber || settings.contactPhone}</span>
                  <span className="text-[0.8125rem] text-white/50">{t("business.whatsapp")}</span>
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="inline-flex min-h-9 items-center gap-2.5 break-all hover:text-white">
                  <Mail aria-hidden className="size-4 shrink-0 text-white/50" strokeWidth={1.75} />
                  {settings.contactEmail}
                </a>
              </li>
            )}
            <li className="flex gap-2.5 pt-1.5">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-white/50" strokeWidth={1.75} />
              <address className="not-italic whitespace-pre-line">{settings.businessAddress}</address>
            </li>
            <li className="flex gap-2.5 pt-1.5">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-white/50" strokeWidth={1.75} />
              <span>{hours}</span>
            </li>
          </ul>
          {/* Registration, spec-sheet style. */}
          <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-white/10 pt-4 text-[0.8125rem]">
            <dt className="text-white/50">{t("business.bin")}</dt>
            <dd className="re-mono text-white/85">{BUSINESS.vatBin}</dd>
            <dt className="text-white/50">{t("business.tradeLicence")}</dt>
            <dd className="re-mono break-all text-white/85">{BUSINESS.tradeLicence.number}</dd>
          </dl>
        </div>

        <nav aria-label={t("footer.catalogueHeading")} className="md:col-span-2">
          <h2 className="re-label !text-white/55">{t("footer.catalogueHeading")}</h2>
          <ul className="mt-4 space-y-1 text-[0.9375rem]">
            {PRIMARY_NAV.filter((item) => item.key !== "devices" || showDevices).map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="inline-block py-1 hover:text-white">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/rfq" className="inline-block py-1 font-semibold text-white hover:underline">
                {t("nav.rfqLong")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t("footer.policiesHeading")} className="md:col-span-3">
          <h2 className="re-label !text-white/55">{t("footer.policiesHeading")}</h2>
          <ul className="mt-4 space-y-1 text-[0.9375rem]">
            {POLICIES.map((p) => (
              <li key={p}>
                <Link href={`/policies/${p}`} className="inline-block py-1 hover:text-white">
                  {t(`footer.${p}`)}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="re-label mt-8 !text-white/55">{t("footer.paymentHeading")}</h2>
          <p className="mt-3 text-[0.9375rem] text-white">{t("footer.paymentMethods")}</p>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="re-shell flex flex-wrap items-center justify-between gap-2 py-5 text-[0.8125rem] text-white/50">
          <p>{t("footer.rights", { year })}</p>
          <p className="re-mono">rakibenterprise-bd.com</p>
        </div>
      </div>
    </footer>
  );
}
