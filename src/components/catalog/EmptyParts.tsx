import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Camera, ClipboardList, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBootstrap } from "@/lib/api/site";
import { telHref } from "@/lib/format";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppLink } from "./WhatsAppLink";

/**
 * "Nothing listed" is never a dead end: the answer is a person. WhatsApp a
 * photo (primary), send a quote request, or call — stacked full-width on
 * phones (one thumb, one tap), a row from sm up.
 */
export async function EmptyParts({
  whatsapp,
  context,
  title,
  body,
  action,
}: {
  whatsapp: string;
  /** Prefilled WhatsApp text, e.g. "Parts for Juki DDL-8700". */
  context: string;
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const [t, boot] = await Promise.all([getTranslations({ locale, namespace: "catalog.listing" }), getBootstrap(locale)]);
  const phone = boot.settings.contactPhone;
  const tel = telHref(phone);
  const cta = "w-full sm:w-auto max-sm:h-auto max-sm:min-h-12 max-sm:whitespace-normal max-sm:py-2 max-sm:text-center";
  return (
    <div className="relative border border-dashed border-re-steel-400 bg-re-paper p-5 sm:p-8" data-testid="empty-parts">
      <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center border border-re-ink text-re-ink">
          <Camera className="size-6" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{title ?? t("emptyTitle")}</p>
          <p className="mt-1.5 max-w-xl text-re-steel-600">{body ?? t("emptyBody")}</p>
          <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
            <WhatsAppLink number={whatsapp} text={t("emptyWhatsappText", { context })} size="lg" className={cta}>
              {t("emptyCta")}
            </WhatsAppLink>
            <Link href="/rfq" className={buttonClass({ variant: "secondary", size: "lg" }, cta)}>
              <ClipboardList aria-hidden strokeWidth={1.75} />
              {t("emptyQuote")}
            </Link>
            {tel && (
              <a href={tel} className={buttonClass({ variant: "ghost", size: "lg" }, `${cta} border border-re-steel-200`)}>
                <Phone aria-hidden strokeWidth={1.75} />
                {t("emptyCall")}
                <span className="re-mono text-[0.9375rem] font-normal">{phone}</span>
              </a>
            )}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
