import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/params";
import { FileSpreadsheet, Info, Phone, ReceiptText, ShieldCheck, Truck, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import { getBootstrap } from "@/lib/api/site";
import { telHref, whatsappHref } from "@/lib/format";
import { SearchInput } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppIcon } from "@/components/icons/brand";
import { PART_ICONS } from "@/components/icons/parts";
import { CategoryGrid, MachineBrandTiles } from "@/components/home/HomeSections";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return {
    alternates: {
      canonical: getPathname({ href: "/", locale: locale }),
      languages: {
        en: getPathname({ href: "/", locale: "en" }),
        bn: getPathname({ href: "/", locale: "bn" }),
        "x-default": getPathname({ href: "/", locale: "en" }),
      },
    },
  };
}

const HERO_ICONS = ["needle", "hook", "bobbinCase", "presserFoot", "feedDog", "servoMotor", "controlBox", "knife"] as const;

/**
 * Interim home (Phase 0): search-first hero, machine brands, part types.
 * Redesigned in Phase 2.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations(), getBootstrap(locale)]);
  const { settings } = boot;
  const wa = whatsappHref(settings.whatsappNumber || settings.contactPhone, t("ui.askWhatsapp"));
  const tel = telHref(settings.contactPhone);

  return (
    <>
      {/* Hero */}
      <section className="re-grid-paper border-b border-re-steel-200">
        <div className="re-shell grid gap-10 py-10 md:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="re-label flex items-center gap-2">
              <span aria-hidden className="inline-block h-2.5 w-2.5 bg-re-red" />
              {t("home.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-[16ch] text-[2.5rem] leading-[0.98] font-extrabold tracking-[-0.015em] text-re-ink [font-stretch:72%] sm:text-[3.5rem] lg:text-[4.25rem] bn:text-[2.25rem] bn:leading-[1.3] bn:font-bold bn:tracking-normal bn:[font-stretch:100%] bn:sm:text-[3rem] bn:lg:text-[3.5rem]">
              {t("home.title")}
            </h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] text-re-steel-600">{t("home.lead")}</p>

            <SearchInput
              size="lg"
              action={getPathname({ href: "/search", locale: locale })}
              label={t("header.searchLabel")}
              placeholder={t("header.searchPlaceholder")}
              submitLabel={t("header.searchSubmit")}
              className="mt-8 max-w-2xl"
            />
            <p className="mt-3 text-[0.875rem] text-re-steel-600">
              {t.rich("home.searchHint", {
                code: (chunks) => (
                  <Link
                    href={{ pathname: "/search", query: { q: "B1101-012-000" } }}
                    className="re-mono rounded-re-sm bg-re-paper px-1 text-re-ink ring-1 ring-re-steel-200 hover:text-re-blue"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp", size: "lg" })}>
                  <WhatsAppIcon />
                  {t("home.whatsappCta")}
                </a>
              )}
              {tel && (
                <a href={tel} className={buttonClass({ variant: "secondary", size: "lg" })}>
                  <Phone aria-hidden strokeWidth={1.75} />
                  {t("home.callCta")}
                  <span className="re-mono text-sm font-normal">{settings.contactPhone}</span>
                </a>
              )}
              {!wa && !tel && (
                <Link href="/rfq" className={buttonClass({ variant: "primary", size: "lg" })}>
                  {t("home.rfqCta")}
                </Link>
              )}
            </div>
          </div>

          {/* Parts-book index panel */}
          <aside aria-hidden className="hidden lg:col-span-5 lg:block">
            <div className="border border-re-ink bg-re-paper">
              <div className="flex items-center justify-between border-b border-re-ink px-4 py-2">
                <span className="re-label text-re-ink">{t("home.indexTitle")}</span>
                <span className="re-mono text-[0.6875rem] text-re-steel-600">RE-CAT</span>
              </div>
              <ul className="grid grid-cols-4 gap-px bg-re-steel-200">
                {HERO_ICONS.map((k, i) => {
                  const Icon = PART_ICONS[k];
                  return (
                    <li key={k} className="flex aspect-square flex-col justify-between bg-re-paper p-3">
                      <span className="re-mono text-[0.625rem] text-re-steel-400">{String(i + 1).padStart(2, "0")}</span>
                      <Icon className="size-10 self-center text-re-ink" />
                      <span className="truncate text-center text-[0.6875rem] font-semibold text-re-steel-600">
                        {t(`parts.${k}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-re-steel-200">
        <ul className="re-shell grid grid-cols-2 divide-re-steel-200 md:grid-cols-4 md:divide-x">
          {(
            [
              [ShieldCheck, "partNumbers"],
              [Truck, "dispatch"],
              [Wallet, "payment"],
              [ReceiptText, "invoice"],
            ] as const
          ).map(([Icon, key]) => (
            <li key={key} className="flex items-center gap-3 py-4 md:px-5 md:first:pl-0">
              <Icon aria-hidden className="size-5 shrink-0 text-re-red" strokeWidth={1.75} />
              <span className="text-[0.875rem] leading-snug font-semibold">{t(`home.trust.${key}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {!boot.live && (
        <p className="re-shell mt-6 flex items-center gap-2 text-[0.875rem] text-re-blue">
          <Info aria-hidden className="size-4 shrink-0" />
          {t("home.offline")}
        </p>
      )}

      <MachineBrandTiles brands={boot.machineBrands} />
      <CategoryGrid categories={boot.categories} />

      {/* RFQ band */}
      <section className="re-shell mt-16">
        <div className="relative grid gap-6 border border-re-ink p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-re-red" />
          <div className="pl-2">
            <h2 className="text-[1.625rem] sm:text-[2rem]">{t("home.rfqHeading")}</h2>
            <p className="mt-2 max-w-2xl text-re-steel-600">{t("home.rfqBody")}</p>
          </div>
          <Link href="/rfq" className={buttonClass({ variant: "primary", size: "lg" }, "justify-self-start")}>
            <FileSpreadsheet aria-hidden strokeWidth={1.75} />
            {t("home.rfqCta")}
          </Link>
        </div>
      </section>
    </>
  );
}
