import { ClipboardList, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { MachinePicker, type PickerBrand } from "@/components/catalog/MachinePicker";
import { SearchInput } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import type { HomeCopy } from "./content";

/**
 * Search-first hero. The part-number box IS the hero (the header's own
 * mobile search row hides itself while `[data-hero-search]` is on the page,
 * so phones see one search bar above the fold). The h1 is the LCP element:
 * plain server-rendered text, never animated.
 */
export function Hero({
  copy,
  examples,
  picker,
  paths,
  phone,
  tel,
  whatsapp,
}: {
  copy: HomeCopy | null;
  examples: string[];
  picker: PickerBrand[];
  paths: { search: string; find: string; machines: string };
  phone: string;
  tel: string;
  whatsapp: string;
}) {
  const t = useTranslations();
  return (
    <section className="re-grid-paper border-b border-re-steel-200">
      <div className="re-shell grid gap-8 pt-7 pb-10 md:pt-12 lg:grid-cols-12 lg:gap-12 lg:pt-16 lg:pb-16">
        <div className="lg:col-span-7">
          <p className="re-label flex items-center gap-2">
            <span aria-hidden className="inline-block h-2.5 w-2.5 bg-re-red" />
            {copy?.eyebrow || t("home.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-[18ch] text-[2.25rem] leading-[0.98] font-extrabold tracking-[-0.015em] text-re-ink [font-stretch:72%] sm:text-[3.25rem] lg:text-[4rem] bn:text-[2rem] bn:leading-[1.3] bn:font-bold bn:tracking-normal bn:[font-stretch:100%] bn:sm:text-[2.75rem] bn:lg:text-[3.25rem]">
            {copy?.title || t("home.title")}
          </h1>

          <div data-hero-search className="mt-6 max-w-2xl md:mt-8">
            <SearchInput
              size="lg"
              action={paths.search}
              label={t("header.searchLabel")}
              placeholder={t("home.searchPlaceholder")}
              submitLabel={t("header.searchSubmit")}
              className="bg-re-paper"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.875rem] text-re-steel-600">
              {examples.length > 0 && (
                <>
                  <span>{t("home.examples")}</span>
                  {examples.map((pn) => (
                    <Link
                      key={pn}
                      href={{ pathname: "/search", query: { q: pn } }}
                      className="re-mono inline-flex min-h-9 items-center rounded-re-sm border border-re-steel-400 bg-re-paper px-2.5 text-[0.8125rem] text-re-ink transition-colors duration-150 hover:border-re-ink hover:text-re-blue"
                    >
                      {pn}
                    </Link>
                  ))}
                </>
              )}
              <span className="basis-full text-[0.8125rem] sm:basis-auto sm:pl-1">{t("home.searchNote")}</span>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-[1.0625rem] text-re-steel-600">{copy?.subtitle || t("home.lead")}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="re-label w-full text-re-red-text sm:w-auto">{t("home.lineDown")}</span>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp", size: "lg" })}>
                <WhatsAppIcon />
                {t("home.whatsappCta")}
              </a>
            )}
            {tel && (
              <a href={tel} className={buttonClass({ variant: "secondary", size: "lg" })}>
                <Phone aria-hidden strokeWidth={1.75} />
                {t("home.callCta")}
                <span className="re-mono text-sm font-normal">{phone}</span>
              </a>
            )}
            {copy?.cta && (
              <Link href={copy.cta.href} className={buttonClass({ variant: "link" }, "min-h-11 font-semibold")}>
                <ClipboardList aria-hidden className="size-4" strokeWidth={1.75} />
                {copy.cta.label}
              </Link>
            )}
          </div>
        </div>

        {picker.length > 0 && (
          <aside aria-labelledby="home-finder" className="self-start border border-re-ink bg-re-paper lg:col-span-5 lg:mt-8">
            <div className="flex items-center justify-between gap-3 border-b border-re-ink px-4 py-2.5">
              <span className="re-label text-re-ink">{t("catalog.machines.finderTitle")}</span>
              <span aria-hidden className="re-mono text-[0.6875rem] text-re-steel-600">
                RE · FIND
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <h2 id="home-finder" className="text-[1.375rem] text-re-ink sm:text-[1.625rem]">
                {t("home.finderTitle")}
              </h2>
              <p className="mt-1.5 text-[0.9375rem] text-re-steel-600">{t("home.finderBody")}</p>
              <MachinePicker
                className="mt-5 lg:grid-cols-1"
                action={paths.find}
                machinesPath={paths.machines}
                brands={picker}
                labels={{
                  brand: t("catalog.machines.finderBrand"),
                  model: t("catalog.machines.finderModel"),
                  chooseBrand: t("catalog.machines.finderChooseBrand"),
                  anyModel: t("catalog.machines.finderAnyModel"),
                  submit: t("catalog.machines.finderSubmit"),
                }}
              />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
