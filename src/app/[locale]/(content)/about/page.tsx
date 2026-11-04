import type { Metadata } from "next";
import { ArrowRight, FileSpreadsheet, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap } from "@/lib/api/site";
import { telHref, whatsappHref } from "@/lib/format";
import { catalogMetadata } from "@/lib/seo/metadata";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { PART_ICONS, partIconFor } from "@/components/icons/parts";
import { WhatsAppIcon } from "@/components/icons/brand";
import { ProcessScene } from "@/components/scroll/ProcessScene";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/button-styles";
import { BUSINESS, businessLocale } from "@/config/business";
import { mono, SisterConcernNote } from "@/components/content/BusinessFacts";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  return catalogMetadata({
    locale,
    href: "/about",
    title: t("about.metaTitle"),
    description: t("about.metaDescription"),
    siteName: boot.settings.siteName || t("meta.siteName"),
  });
}

const STEPS = ["1", "2", "3", "4", "5"] as const;

/**
 * About — the company story from the verified facts (messages → about,
 * config/business: 35+ years, Mirpur-1, proprietor, licence, BIN, sister
 * concern — no founding year), what we stock (live from the catalogue), the
 * genuine/compatible policy, how we work with factories (the page's one
 * light scroll scene: a process rule that draws as you read), and contact.
 */
export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations(), getBootstrap(locale)]);
  const { settings, machineBrands, categories, partsBrands } = boot;
  const wa = whatsappHref(settings.whatsappNumber || settings.contactPhone, t("ui.askWhatsapp"));
  const tel = telHref(settings.contactPhone);
  const tel2 = telHref(settings.contactPhoneSecondary ?? "");
  const l = businessLocale(locale);
  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

  const meta = [
    { label: t("about.facts.base"), value: t("about.facts.baseValue") },
    { label: t("about.facts.experience"), value: t("about.facts.experienceValue") },
    ...(machineBrands.length ? [{ label: t("about.facts.machines"), value: machineBrands.length }] : []),
    ...(categories.length ? [{ label: t("about.facts.types"), value: categories.length }] : []),
    { label: t("about.facts.grades"), value: t("about.facts.gradesValue") },
  ];

  const listHead = "re-label border-b border-re-ink pb-2";
  const row =
    "group flex min-h-12 items-center justify-between gap-3 border-b border-re-steel-200 py-2 transition-colors duration-150 hover:bg-re-steel-50";

  return (
    <>
      <SheetHeader
        crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("about.metaTitle") }]}
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        lead={t("about.lead")}
        meta={meta}
      />

      {/* Story */}
      <section aria-label={t("about.eyebrow")} className="re-shell mt-12 grid gap-8 lg:grid-cols-12">
        <div className="relative border-l-[3px] border-re-red pl-5 lg:col-span-8 sm:pl-7">
          <p className="text-[1.25rem] leading-[1.55] text-re-ink sm:text-[1.5rem] bn:leading-[1.75]">{t("about.story.p1")}</p>
          <p className="mt-5 max-w-2xl text-[1.0625rem] text-re-ink">{t.rich("about.story.p2", { bin: BUSINESS.vatBin, mono })}</p>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-re-steel-600">{t("about.story.p3")}</p>
          <SisterConcernNote className="mt-6 max-w-2xl border-t border-dashed border-re-steel-200 pt-4 text-[0.9375rem] text-re-steel-600" />
        </div>
        <dl className="self-start border border-re-ink bg-re-paper text-[0.9375rem] lg:col-span-4">
          <div className="border-b border-re-ink px-4 py-2.5">
            <dt className="re-label text-re-ink">{t("about.factsLabel")}</dt>
          </div>
          {[
            { label: t("business.proprietor"), value: <span className="text-re-ink">{BUSINESS.proprietor[l]}</span> },
            { label: t("home.trust.address"), value: <address className="not-italic text-re-ink">{settings.businessAddress}</address> },
            {
              label: t("business.mobile"),
              value: (
                <a href={tel} className="re-mono font-semibold text-re-ink hover:text-re-blue">
                  {settings.contactPhone}
                </a>
              ),
            },
            ...(tel2
              ? [{
                  label: t("business.landline"),
                  value: (
                    <a href={tel2} className="re-mono font-semibold text-re-ink hover:text-re-blue">
                      {settings.contactPhoneSecondary}
                    </a>
                  ),
                }]
              : []),
            { label: t("business.vatRegistered"), value: <span className="re-mono text-re-ink">BIN {BUSINESS.vatBin}</span> },
            {
              label: t("business.tradeLicence"),
              value: (
                <span className="text-re-ink">
                  <span className="re-mono break-all">{BUSINESS.tradeLicence.number}</span>
                  <span className="block text-[0.8125rem] text-re-steel-600">{BUSINESS.tradeLicence.authority[l]}</span>
                </span>
              ),
            },
            { label: t("home.trust.payment"), value: <span className="text-re-ink">{t("footer.paymentMethods")}</span> },
          ].map((r) => (
            <div key={r.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 border-b border-re-steel-200 px-4 py-3 last:border-b-0">
              <dt className="text-re-steel-600">{r.label}</dt>
              <dd className="min-w-0">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* What we stock */}
      <section aria-labelledby="about-stock" className="re-shell mt-16">
        <SectionHeader id="about-stock" index="01" title={t("about.stockHeading")} subtitle={t("about.stockSub")} />
        <div className="mt-6 grid gap-10 md:grid-cols-3 md:gap-8">
          <div>
            <h3 className={listHead}>{t("about.machinesLabel")}</h3>
            <ul>
              {[...machineBrands].sort(byName).map((b) => (
                <li key={b.slug}>
                  <Link href={`/machines/${b.slug}`} className={row}>
                    <span className="text-[1.125rem] font-extrabold text-re-ink [font-stretch:75%] group-hover:text-re-red-text">{b.name}</span>
                    <span className="re-mono text-[0.8125rem] text-re-steel-600">{t("home.models", { count: b.modelCount })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={listHead}>{t("about.typesLabel")}</h3>
            <ul>
              {categories.map((c) => {
                const key = partIconFor(`${c.slug} ${c.name}`);
                const Icon = key ? PART_ICONS[key] : null;
                return (
                  <li key={c.slug}>
                    <Link href={`/categories/${c.slug}`} className={row}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span aria-hidden className="grid size-7 shrink-0 place-items-center text-re-ink">
                          {Icon ? <Icon className="size-6" /> : <span className="size-1.5 bg-re-steel-400" />}
                        </span>
                        <span className="truncate font-semibold text-re-ink group-hover:text-re-red-text">{c.name}</span>
                      </span>
                      <span className="re-mono shrink-0 text-[0.8125rem] text-re-steel-600">{t("home.parts", { count: c.productCount })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className={listHead}>{t("about.brandsLabel")}</h3>
            <ul>
              {[...partsBrands].sort((a, b) => Number(b.isOem) - Number(a.isOem) || byName(a, b)).map((b) => (
                <li key={b.slug}>
                  <Link href={`/brands/${b.slug}`} className={row}>
                    <span className="font-semibold text-re-ink group-hover:text-re-red-text">{b.name}</span>
                    <Badge grade={b.isOem ? "genuine" : "compatible"} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Genuine / OEM policy */}
      <section aria-labelledby="about-policy" className="re-shell mt-16">
        <SectionHeader id="about-policy" index="02" title={t("about.policyHeading")} subtitle={t("about.policySub")} />
        <div className="mt-6 grid gap-px border border-re-steel-200 bg-re-steel-200 md:grid-cols-3">
          {(["genuine", "compatible", "label"] as const).map((k) => (
            <div key={k} className="bg-re-paper p-5 sm:p-6">
              {k === "label" ? (
                <span className="re-mono inline-flex h-6 items-center border border-re-ink px-1.5 text-[0.75rem]">B1830-227-000</span>
              ) : (
                <Badge grade={k} />
              )}
              <h3 className="mt-4 text-[1.25rem] text-re-ink">{t(`about.policy.${k}Title`)}</h3>
              <p className="mt-2 text-[0.9375rem] text-re-steel-600">{t(`about.policy.${k}Body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How we work — the scroll scene */}
      <section aria-labelledby="about-process" className="re-shell mt-16 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-10">
            <SectionHeader id="about-process" index="03" title={t("about.processHeading")} subtitle={t("about.processSub")} />
          </div>
        </div>
        <ProcessScene
          className="lg:col-span-7 lg:pt-6"
          active={2}
          steps={STEPS.map((s) => ({
            title: t(`about.process.${s}.title`),
            body: t(`about.process.${s}.body`),
            spec: t(`about.process.${s}.spec`),
          }))}
        />
      </section>

      {/* Contact */}
      <section aria-labelledby="about-contact" className="re-shell mt-16">
        <div className="relative grid gap-6 border border-re-ink p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-re-red" />
          <div className="pl-2">
            <h2 id="about-contact" className="text-[1.625rem] sm:text-[2rem]">
              {t("about.contactHeading")}
            </h2>
            <p className="mt-2 max-w-2xl text-re-steel-600">{t("about.contactBody")}</p>
            <Link href="/contact" className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-re-blue hover:underline">
              {t("about.contactLink")} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 pl-2 md:flex-col md:items-stretch md:pl-0">
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp", size: "lg" })}>
                <WhatsAppIcon />
                {t("about.whatsappCta")}
              </a>
            )}
            {tel && (
              <a href={tel} className={buttonClass({ variant: "secondary", size: "lg" })}>
                <Phone aria-hidden strokeWidth={1.75} />
                {t("about.callCta")}
                <span className="re-mono text-sm font-normal">{settings.contactPhone}</span>
              </a>
            )}
            <Link href="/rfq" className={buttonClass({ variant: "primary", size: "lg" })}>
              <FileSpreadsheet aria-hidden strokeWidth={1.75} />
              {t("about.rfqCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
