import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BUSINESS, businessLocale } from "@/config/business";
import { cn } from "@/lib/utils";
import { telHref } from "@/lib/format";
import type { SiteSettings } from "@/lib/api/types";

/** Latin-digit mono run for numbers inside running text (BIN, licence, phones). */
export const mono = (chunks: ReactNode) => <span className="re-mono">{chunks}</span>;
const bold = (chunks: ReactNode) => <strong className="font-semibold text-re-ink">{chunks}</strong>;

/** "Sat–Thu 10:00–20:00 · Fri closed" (localised). */
export function useHoursShort(): string {
  const t = useTranslations("business");
  return t("hoursShort", { open: BUSINESS.hours.open, close: BUSINESS.hours.close });
}

/** Opening hours as a two-row spec table. */
export function HoursTable({ className }: { className?: string }) {
  const t = useTranslations("business");
  const rows = [
    { days: t("satThu"), time: `${BUSINESS.hours.open} – ${BUSINESS.hours.close}` },
    { days: t("fri"), time: t("closed") },
  ];
  return (
    <dl className={cn("space-y-1.5 text-[0.9375rem]", className)}>
      {rows.map((r) => (
        <div key={r.days} className="flex justify-between gap-4 border-b border-dashed border-re-steel-200 pb-1.5">
          <dt>{r.days}</dt>
          <dd className="re-mono">{r.time}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "VAT registered · BIN …" and "Trade licence … (DNCC)" lines. */
export function RegistrationLines({ className, short = false }: { className?: string; short?: boolean }) {
  const t = useTranslations("business");
  const l = businessLocale(useLocale());
  return (
    <ul className={cn("space-y-1", className)}>
      <li>{t.rich("binLine", { bin: BUSINESS.vatBin, mono })}</li>
      <li>
        {t.rich("tradeLicenceLine", {
          number: BUSINESS.tradeLicence.number,
          authority: short ? BUSINESS.tradeLicence.authorityShort : BUSINESS.tradeLicence.authority[l],
          mono,
        })}
      </li>
    </ul>
  );
}

/** One-line note about the sister concern. */
export function SisterConcernNote({ className }: { className?: string }) {
  const t = useTranslations("business");
  const l = businessLocale(useLocale());
  const s = BUSINESS.sisterConcern;
  return (
    <p className={className}>
      {t.rich("sisterNote", {
        name: s.name[l],
        address: s.address[l],
        phone: s.phone.display,
        b: bold,
        mono: (chunks) => (
          <a href={`tel:${s.phone.e164}`} className="re-mono whitespace-nowrap hover:text-re-blue">
            {chunks}
          </a>
        ),
      })}
    </p>
  );
}

/**
 * Compact one-line contact: "Call or WhatsApp +880 1711-279319 · Landline
 * +880 2-48036796 · Sat–Thu 10:00–20:00 · Fri closed". Numbers come from
 * (defaulted) settings.
 */
export function ContactLine({ settings, className, reply = false }: { settings: SiteSettings; className?: string; reply?: boolean }) {
  const t = useTranslations("business");
  const hours = useHoursShort();
  const tel = telHref(settings.contactPhone);
  const tel2 = telHref(settings.contactPhoneSecondary ?? "");
  const link = "re-mono font-semibold whitespace-nowrap text-re-ink hover:text-re-blue";
  return (
    <p className={cn("text-[0.9375rem] text-re-steel-600", className)}>
      {tel && (
        <>
          {t("callOrWhatsapp")}{" "}
          <a href={tel} className={link}>
            {settings.contactPhone}
          </a>
        </>
      )}
      {tel2 && (
        <>
          {" · "}
          {t("landline")}{" "}
          <a href={tel2} className={link}>
            {settings.contactPhoneSecondary}
          </a>
        </>
      )}
      {(tel || tel2) && <br />}
      <span>{reply ? t("replyHours", { open: BUSINESS.hours.open, close: BUSINESS.hours.close }) : hours}</span>
    </p>
  );
}
