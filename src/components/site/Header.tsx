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
import { MobileMenu } from "./MobileMenu";
import { PRIMARY_NAV } from "./nav";

/**
 * Site header: ink top strip (tagline · phone · language), logo + search +
 * quote list, then the desktop nav row. On mobile the search drops to its own
 * full-width row; the rest of the nav lives in the menu sheet and the bottom
 * bar.
 */
export function Header({ settings }: { settings: SiteSettings }) {
  const t = useTranslations();
  const locale = useLocale();
  const searchAction = getPathname({ href: "/search", locale });
  const tel = telHref(settings.contactPhone);
  const showCart = settings.directOrdersEnabled;

  return (
    <header className="border-b border-re-steel-200 bg-re-paper">
      {/* Top strip */}
      <div className="bg-re-ink text-white">
        <div className="re-shell flex h-9 items-center justify-between gap-4 text-[0.8125rem]">
          <p className="truncate text-white/75">{t("header.topline")}</p>
          <div className="flex shrink-0 items-center gap-1">
            {tel && (
              <a href={tel} className="hidden h-9 items-center gap-1.5 px-2 text-white/85 hover:text-white sm:inline-flex">
                <Phone aria-hidden className="size-3.5" strokeWidth={2} />
                <span className="re-mono">{settings.contactPhone}</span>
              </a>
            )}
            <LocaleSwitch tone="dark" className="h-9" />
          </div>
        </div>
      </div>

      {/* Main row */}
      <div className="re-shell flex items-center gap-3 py-3 lg:gap-6 lg:py-4">
        <Link href="/" aria-label={t("a11y.home")} className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo/rakib-enterprise.png"
            alt=""
            width={434}
            height={240}
            priority
            sizes="88px"
            className="h-9 w-auto lg:h-11"
          />
          <span className="flex flex-col leading-none">
            <span className="font-re-sans text-[1.0625rem] font-extrabold tracking-[0.02em] text-re-ink [font-stretch:78%] lg:text-[1.25rem]">
              RAKIB ENTERPRISE
            </span>
            <span className="re-label mt-1 hidden text-[0.625rem] xs:block">{t("meta.tagline")}</span>
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
            <MobileMenu phone={settings.contactPhone} showCart={showCart} />
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

      {/* Desktop nav */}
      <nav aria-label={t("a11y.mainNav")} className="hidden border-t border-re-steel-200 lg:block">
        <ul className="re-shell flex h-11 items-stretch gap-1">
          {PRIMARY_NAV.map((item) => (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                className="relative inline-flex items-center px-3 text-[0.9375rem] font-semibold text-re-ink transition-colors duration-150 hover:text-re-red-text after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-re-red after:transition-transform after:duration-150 hover:after:scale-x-100 first:-ml-3"
              >
                {item.key === "rfq" ? t("nav.rfqLong") : t(`nav.${item.key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
