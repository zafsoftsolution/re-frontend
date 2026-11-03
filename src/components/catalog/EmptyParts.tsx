import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { WhatsAppLink } from "./WhatsAppLink";

/** "Nothing listed" — the answer is always a person on WhatsApp. */
export function EmptyParts({
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
  const t = useTranslations("catalog.listing");
  return (
    <div className="relative border border-dashed border-re-steel-400 bg-re-paper p-6 sm:p-8">
      <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center border border-re-ink text-re-ink">
          <Camera className="size-6" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold">{title ?? t("emptyTitle")}</p>
          <p className="mt-1.5 max-w-xl text-re-steel-600">{body ?? t("emptyBody")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <WhatsAppLink number={whatsapp} text={t("emptyWhatsappText", { context })}>
              {t("emptyCta")}
            </WhatsAppLink>
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
