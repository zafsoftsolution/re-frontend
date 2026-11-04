import { ClipboardList, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { HookIcon } from "@/components/icons/parts";
import { QuoteCount } from "@/components/ui/ListCount";
import { whatsappHref } from "@/lib/format";

/**
 * Sticky bottom bar on phones: Search · By machine (find parts for your
 * machine → /machines) · Quote list (count) · WhatsApp.
 * ≥ 56px tall cells, padded for the iOS/Android gesture area.
 */
export function MobileBottomBar({ whatsapp }: { whatsapp: string }) {
  const t = useTranslations();
  const wa = whatsappHref(whatsapp, t("ui.askWhatsapp"));
  const cell =
    "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-semibold text-re-ink active:bg-re-steel-100";

  return (
    <nav
      aria-label={t("a11y.mobileNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-re-steel-200 bg-re-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-[2px] lg:hidden"
    >
      <ul className="flex">
        <li className="flex flex-1">
          <Link href="/search" className={cell}>
            <Search aria-hidden className="size-5" strokeWidth={1.75} />
            {t("mobileBar.search")}
          </Link>
        </li>
        <li className="flex flex-1">
          <Link href="/machines" className={cell}>
            <HookIcon className="size-5" />
            {t("mobileBar.byMachine")}
          </Link>
        </li>
        <li className="flex flex-1">
          <Link href="/rfq" className={cell}>
            <span className="relative">
              <ClipboardList aria-hidden className="size-5" strokeWidth={1.75} />
              <QuoteCount className="absolute -top-2 left-3.5" />
            </span>
            {t("mobileBar.rfq")}
          </Link>
        </li>
        <li className="flex flex-1">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener" className={`${cell} bg-re-whatsapp text-white active:bg-re-whatsapp-dark`}>
              <WhatsAppIcon className="size-5" />
              {t("mobileBar.whatsapp")}
            </a>
          ) : (
            <Link href="/contact" className={`${cell} bg-re-whatsapp text-white`}>
              <WhatsAppIcon className="size-5" />
              {t("mobileBar.whatsapp")}
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
