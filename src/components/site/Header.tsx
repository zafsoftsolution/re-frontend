import Image from "next/image";
import { ClipboardList, Phone, ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname } from "@/i18n/navigation";
import { SearchInput } from "@/components/ui/Input";
import { CartCount, QuoteCount } from "@/components/ui/ListCount";
import type { SiteSettings } from "@/lib/api/types";
import { telHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useHoursShort } from "@/components/content/BusinessFacts";
import { LocaleSwitch } from "./LocaleSwitch";
import { MegaNav } from "./MegaNav";
import { MobileMenu } from "./MobileMenu";
import { SearchButton } from "./mobile/SearchButton";
import { QuoteIcon } from "./mobile/tab-icons";
import type { NavData } from "./nav";

/**
 * Site header.
 *  1. Ink strip. Desktop/tablet: what we sell (spare parts & devices, never
 *     machines) · phone · language. Phones: one useful line instead — the
 *     tappable sales number — plus the language toggle. It scrolls away.
 *  2. Brand lockup (logo, name, tagline) · search · quote list (· cart).
 *     Phones: a compact sticky 56px app bar — search opens a full-screen
 *     sheet, the quote button carries the count, the menu opens the sheet.
 *  3. Desktop: the sticky mega-menu row (MegaNav), rendered after <header>
 *     so it can stick for the whole page.
 */
export function Header({
  settings,
  nav,
  examples,
}: {
  settings: SiteSettings;
  nav: NavData;
  /** Real part numbers for the search sheet's "try" chips. */
  examples: string[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const searchAction = getPathname({ href: "/search", locale });
  const tel = telHref(settings.contactPhone);
  const showCart = settings.directOrdersEnabled;
  const hours = useHoursShort();
  const whatsapp = settings.whatsappNumber || settings.contactPhone;
  const popular = [...nav.parts, ...nav.devices].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <>
      {/* Top strip */}
      <div className="bg-re-ink text-white">
        <div className="re-shell flex h-9 items-center justify-between gap-4 text-[0.8125rem]">
          {tel ? (
            <a href={tel} className="flex h-9 min-w-0 items-center gap-2 text-white md:hidden">
              <span aria-hidden className="h-3 w-0.5 shrink-0 bg-re-red" />
              <Phone aria-hidden className="size-3.5 shrink-0 text-white/70" strokeWidth={2} />
              <span className="shrink-0 text-white/75">{t("header.call")}</span>
              <span className="re-mono truncate font-medium">{settings.contactPhone}</span>
            </a>
          ) : (
            <p className="flex min-w-0 items-center gap-2.5 text-white/80 md:hidden">
              <span aria-hidden className="h-3 w-0.5 shrink-0 bg-re-red" />
              <span className="truncate">{t("header.toplineShort")}</span>
            </p>
          )}
          <p className="hidden min-w-0 items-center gap-2.5 text-white/80 md:flex">
            <span aria-hidden className="h-3 w-0.5 shrink-0 bg-re-red" />
            <span className="truncate">{t("header.topline")}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {tel && (
              <a href={tel} className="hidden h-9 items-center gap-1.5 px-2 text-white/85 hover:text-white md:inline-flex">
                <Phone aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="re-mono">{settings.contactPhone}</span>
              </a>
            )}
            <span aria-hidden className="hidden h-4 w-px bg-white/20 md:block" />
            <LocaleSwitch tone="dark" className="h-9" />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-re-steel-200 bg-re-paper md:static lg:border-b-0">
        {/* Main row */}
        <div className="re-shell flex h-14 items-center gap-2 md:h-auto md:gap-3 md:py-3 lg:gap-8 lg:py-4">
          <Link href="/" aria-label={t("a11y.home")} className="group flex min-h-11 min-w-0 items-center gap-2 sm:gap-2.5 md:shrink-0 lg:gap-3">
            <Image
              src="/logo/rakib-enterprise.png"
              alt=""
              width={434}
              height={240}
              priority
              sizes="88px"
              className="h-7 w-auto shrink-0 xs:h-8 md:h-9 lg:h-12"
            />
            <span aria-hidden className="hidden h-9 w-px bg-re-steel-200 lg:block" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-re-sans text-[0.9375rem] font-extrabold tracking-[0.02em] whitespace-nowrap text-re-ink [font-stretch:78%] xs:text-[1.0625rem] lg:text-[1.375rem]">
                RAKIB ENTERPRISE
              </span>
              {/* Phones: a short sans tagline that fits without truncating. */}
              <span className="mt-1 text-[0.6875rem] leading-none whitespace-nowrap text-re-steel-600 md:hidden bn:font-re-bn bn:text-[0.75rem]">
                {t("meta.taglineShort")}
              </span>
              <span className="re-label mt-1 hidden truncate !text-[0.625rem] bn:!text-[0.75rem] md:block lg:mt-1.5 lg:!text-[0.6875rem] lg:bn:!text-[0.8125rem]">
                {t("meta.tagline")}
              </span>
            </span>
          </Link>

          <SearchInput
            action={searchAction}
            label={t("header.searchLabel")}
            placeholder={t("header.searchPlaceholder")}
            submitLabel={t("header.searchSubmit")}
            className="hidden max-w-2xl flex-1 md:flex"
          />

          <div className="ml-auto flex shrink-0 items-center gap-0 md:gap-1 lg:gap-2">
            <SearchButton className="md:hidden" examples={examples} popular={popular} whatsapp={whatsapp} />
            {tel && (
              <a
                href={tel}
                className="hidden h-11 items-center gap-2 px-2 text-sm font-semibold hover:text-re-blue xl:inline-flex"
              >
                <Phone aria-hidden className="size-[1.125rem]" strokeWidth={1.75} />
                <span className="re-mono">{settings.contactPhone}</span>
              </a>
            )}
            {showCart && (
              <Link
                href="/cart"
                className="relative hidden h-11 items-center gap-2 px-2 text-sm font-semibold hover:text-re-blue sm:inline-flex"
              >
                <ShoppingCart aria-hidden className="size-5" strokeWidth={1.75} />
                <span className="sr-only lg:not-sr-only">{t("nav.cart")}</span>
                <CartCount className="absolute top-0.5 left-5 lg:static" />
              </Link>
            )}
            {/* Phones: icon button in the tab-bar icon family. */}
            <Link href="/rfq" className="relative grid size-11 place-items-center text-re-ink active:bg-re-steel-100 md:hidden">
              <QuoteIcon className="size-[1.375rem]" />
              <span className="sr-only">{t("nav.rfq")}</span>
              <QuoteCount className="absolute top-0.5 right-0 ring-2 ring-re-paper" />
            </Link>
            <Link
              href="/rfq"
              className={cn(
                "relative hidden h-11 items-center gap-2 rounded-re border border-re-ink px-3 text-sm font-semibold md:inline-flex",
                "transition-colors duration-150 hover:bg-re-ink hover:text-white",
              )}
            >
              <ClipboardList aria-hidden className="size-[1.125rem]" strokeWidth={1.75} />
              <span>{t("nav.rfq")}</span>
              <QuoteCount />
            </Link>
            <div className="lg:hidden">
              <MobileMenu
                nav={nav}
                phone={settings.contactPhone}
                phoneSecondary={settings.contactPhoneSecondary ?? ""}
                whatsapp={whatsapp}
                hours={hours}
                showCart={showCart}
              />
            </div>
          </div>
        </div>
      </header>

      <MegaNav data={nav} />
    </>
  );
}
