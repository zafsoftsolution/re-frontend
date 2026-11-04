import Image from "next/image";
import { ClipboardList, Phone, ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname } from "@/i18n/navigation";
import { SearchInput } from "@/components/ui/Input";
import { CartCount, QuoteCount } from "@/components/ui/ListCount";
import type { SiteSettings } from "@/lib/api/types";
import { telHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocaleSwitch } from "./LocaleSwitch";
import { MegaNav } from "./MegaNav";
import { MobileMenu } from "./MobileMenu";
import type { NavData } from "./nav";

/**
 * Site header.
 *  1. Ink strip — what we sell, in one line (spare parts & devices, never
 *     machines) · phone · language.
 *  2. Brand lockup (logo, name, tagline) · search · quote list (· cart).
 *     On phones the search drops to its own row (hidden on Home, whose hero
 *     search takes its place) and the menu button opens the sheet.
 *  3. Desktop: the sticky mega-menu row (MegaNav), rendered after <header>
 *     so it can stick for the whole page.
 */
export function Header({ settings, nav }: { settings: SiteSettings; nav: NavData }) {
  const t = useTranslations();
  const locale = useLocale();
  const searchAction = getPathname({ href: "/search", locale });
  const tel = telHref(settings.contactPhone);
  const showCart = settings.directOrdersEnabled;

  return (
    <>
      <header className="border-b border-re-steel-200 bg-re-paper lg:border-b-0">
        {/* Top strip */}
        <div className="bg-re-ink text-white">
          <div className="re-shell flex h-9 items-center justify-between gap-4 text-[0.8125rem]">
            <p className="flex min-w-0 items-center gap-2.5 text-white/80">
              <span aria-hidden className="h-3 w-0.5 shrink-0 bg-re-red" />
              <span className="truncate sm:hidden">{t("header.toplineShort")}</span>
              <span className="hidden truncate sm:inline">{t("header.topline")}</span>
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

        {/* Main row */}
        <div className="re-shell flex items-center gap-3 py-3 lg:gap-8 lg:py-4">
          <Link href="/" aria-label={t("a11y.home")} className="group flex min-w-0 items-center gap-2 sm:gap-2.5 md:shrink-0 lg:gap-3">
            <Image
              src="/logo/rakib-enterprise.png"
              alt=""
              width={434}
              height={240}
              priority
              sizes="88px"
              className="h-8 w-auto shrink-0 xs:h-9 lg:h-12"
            />
            <span aria-hidden className="hidden h-9 w-px bg-re-steel-200 lg:block" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-re-sans text-[1rem] font-extrabold tracking-[0.02em] whitespace-nowrap text-re-ink [font-stretch:78%] xs:text-[1.0625rem] lg:text-[1.375rem]">
                RAKIB ENTERPRISE
              </span>
              <span className="re-label mt-1 truncate !text-[0.625rem] bn:!text-[0.75rem] lg:mt-1.5 lg:!text-[0.6875rem] lg:bn:!text-[0.8125rem]">
                <span className="sm:hidden">{t("meta.taglineShort")}</span>
                <span className="hidden sm:inline">{t("meta.tagline")}</span>
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

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
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
                className="relative inline-flex h-11 items-center gap-2 px-2 text-sm font-semibold hover:text-re-blue"
              >
                <ShoppingCart aria-hidden className="size-5" strokeWidth={1.75} />
                <span className="sr-only lg:not-sr-only">{t("nav.cart")}</span>
                <CartCount className="absolute top-0.5 left-5 lg:static" />
              </Link>
            )}
            <Link
              href="/rfq"
              className={cn(
                "relative inline-flex h-11 items-center gap-2 rounded-re border border-re-ink px-3 text-sm font-semibold",
                "transition-colors duration-150 hover:bg-re-ink hover:text-white",
              )}
            >
              <ClipboardList aria-hidden className="size-[1.125rem]" strokeWidth={1.75} />
              <span className="sr-only sm:not-sr-only">{t("nav.rfq")}</span>
              <QuoteCount className="absolute -top-2 -right-2 sm:static" />
            </Link>
            <div className="lg:hidden">
              <MobileMenu
                nav={nav}
                phone={settings.contactPhone}
                whatsapp={settings.whatsappNumber || settings.contactPhone}
                showCart={showCart}
              />
            </div>
          </div>
        </div>

        {/* Mobile search row — hidden on Home, whose hero search takes its place. */}
        <div className="re-shell pb-3 md:hidden [body:has([data-hero-search])_&]:hidden">
          <SearchInput
            action={searchAction}
            label={t("header.searchLabel")}
            placeholder={t("header.searchPlaceholder")}
            submitLabel={t("header.searchSubmit")}
          />
        </div>
      </header>

      <MegaNav data={nav} />
    </>
  );
}
