import { ArrowRight, Check, Clock, FileSpreadsheet, MapPin, Phone, Truck, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PART_ICONS, partIconFor, type PartIconKey } from "@/components/icons/parts";
import { WhatsAppIcon } from "@/components/icons/brand";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { PartsTable } from "@/components/catalog/PartsTable";
import { ScrollStage } from "@/components/scroll/ScrollStage";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/button-styles";
import { BUSINESS } from "@/config/business";
import { HoursTable, useHoursShort } from "@/components/content/BusinessFacts";
import type { CategorySummary, MachineBrandSummary, PartSummary, SiteSettings } from "@/lib/api/types";
import type { HomeCopy } from "./content";

/**
 * Machine brands we stock parts for. Shown (linking to search) when the live
 * catalogue is empty or unreachable, so the home page is never blank.
 */
const FALLBACK_MACHINE_BRANDS: { name: string; country: string }[] = [
  { name: "Juki", country: "JP" },
  { name: "Brother", country: "JP" },
  { name: "Pegasus", country: "JP" },
  { name: "Jack", country: "CN" },
  { name: "Siruba", country: "TW" },
  { name: "Yamato", country: "JP" },
  { name: "Kansai Special", country: "JP" },
  { name: "Typical", country: "CN" },
];

const FALLBACK_QUERY = {
  needle: "needle",
  hook: "hook",
  bobbinCase: "bobbin case",
  presserFoot: "presser foot",
  feedDog: "feed dog",
  servoMotor: "servo motor",
  controlBox: "control box",
  knife: "knife",
} satisfies Partial<Record<PartIconKey, string>>;
const FALLBACK_PART_TYPES = Object.keys(FALLBACK_QUERY) as (keyof typeof FALLBACK_QUERY)[];

const tileGrid = "grid gap-px border border-re-steel-200 bg-re-steel-200";

/** Static class maps (Tailwind needs literal class names). */
const SPAN = {
  base: ["", "col-span-1", "col-span-2"],
  xs: ["", "xs:col-span-1", "xs:col-span-2"],
  sm: ["", "sm:col-span-1", "sm:col-span-2", "sm:col-span-3"],
  lg: ["", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3", "lg:col-span-4", "lg:col-span-5", "lg:col-span-6"],
} as const;

/** Classes that make a trailing "All …" tile fill the last row at each breakpoint, so the grid never shows a hole. */
function fillSpan(n: number, cols: Partial<Record<keyof typeof SPAN, number>>): string {
  return (Object.entries(cols) as [keyof typeof SPAN, number][])
    .map(([bp, c]) => SPAN[bp][c - (n % c)])
    .join(" ");
}

function AllTile({ href, label, className }: { href: string; label: React.ReactNode; className: string }) {
  return (
    <li className={`bg-re-steel-50 ${className}`}>
      <Link
        href={href}
        className="group flex h-full min-h-16 items-center justify-between gap-3 px-4 py-4 font-semibold text-re-blue transition-colors duration-150 hover:bg-re-steel-100"
      >
        {label}
        <ArrowRight aria-hidden className="size-5 transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
const allLink = "inline-flex h-11 items-center gap-1.5 font-semibold text-re-blue hover:underline";

function AllLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={allLink}>
      {children} <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

export function MachineBrandTiles({
  brands,
  copy,
  index,
}: {
  brands: MachineBrandSummary[];
  copy?: HomeCopy | null;
  index: string;
}) {
  const t = useTranslations("home");
  const featured = brands.filter((b) => b.isFeatured);
  const shown = (featured.length >= 4 ? featured : brands).slice(0, 12);
  const tiles = shown.length
    ? shown.map((b) => ({
        key: b.slug,
        name: b.name,
        logo: b.logo,
        country: b.country,
        meta: t("models", { count: b.modelCount }),
        href: `/machines/${b.slug}`,
      }))
    : FALLBACK_MACHINE_BRANDS.map((b) => ({
        key: b.name,
        name: b.name,
        logo: "",
        country: b.country,
        meta: null,
        href: { pathname: "/search", query: { q: b.name } } as const,
      }));

  return (
    <section aria-labelledby="home-machines" className="re-shell mt-16">
      <SectionHeader
        id="home-machines"
        index={index}
        title={copy?.title || t("machinesHeading")}
        subtitle={copy?.subtitle || t("machinesSub")}
        action={<AllLink href={copy?.cta?.href || "/machines"}>{copy?.cta?.label || t("machinesAll")}</AllLink>}
      />
      <ul className={`${tileGrid} mt-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`}>
        {tiles.map((b) => (
          <li key={b.key} className="bg-re-paper">
            <Link
              href={b.href}
              className="group flex h-full min-h-36 flex-col justify-between gap-3 p-4 transition-colors duration-150 hover:bg-re-steel-50"
            >
              <span className="flex items-start justify-between gap-2">
                {b.logo ? (
                  <CatalogImage
                    src={b.logo}
                    alt=""
                    sizes="112px"
                    className="aspect-[5/2] w-28 max-w-[70%] bg-transparent"
                  />
                ) : (
                  <span aria-hidden className="re-mono text-[0.6875rem] text-re-steel-400">
                    —
                  </span>
                )}
                {b.country && <span className="re-mono text-[0.6875rem] text-re-steel-600">{b.country}</span>}
              </span>
              <span>
                <span className="block text-[1.375rem] leading-none font-extrabold text-re-ink [font-stretch:75%] group-hover:text-re-red-text">
                  {b.name}
                </span>
                <span className="mt-1.5 flex items-center justify-between text-[0.8125rem] text-re-steel-600">
                  <span className="re-mono">{b.meta}</span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 -translate-x-1 opacity-0 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </span>
              </span>
            </Link>
          </li>
        ))}
        <AllTile
          href={copy?.cta?.href || "/machines"}
          label={copy?.cta?.label || t("machinesAll")}
          className={fillSpan(tiles.length, { base: 2, sm: 3, lg: 6 })}
        />
      </ul>
    </section>
  );
}

/** Admin-picked categories (in order), else the Featured ones, else all top-level. */
export function pickCategories(categories: CategorySummary[], ids: string[] = []): CategorySummary[] {
  if (ids.length) {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const picked = ids.map((id) => byId.get(id)).filter((c): c is CategorySummary => Boolean(c));
    if (picked.length) return picked;
  }
  const featured = categories.filter((c) => c.isFeatured);
  return featured.length >= 4 ? featured : categories;
}

export function CategoryGrid({
  categories,
  copy,
  index,
}: {
  categories: CategorySummary[];
  copy?: HomeCopy | null;
  index: string;
}) {
  const t = useTranslations();
  const rows = categories.length
    ? categories.slice(0, 12).map((c) => ({
        key: c.slug,
        name: c.name,
        icon: partIconFor(`${c.slug} ${c.name}`),
        meta: t("home.parts", { count: c.productCount }),
        href: `/categories/${c.slug}`,
      }))
    : FALLBACK_PART_TYPES.map((k) => ({
        key: k,
        name: t(`parts.${k}`),
        icon: k,
        meta: null,
        // Search in English: part names are stored in English.
        href: { pathname: "/search", query: { q: FALLBACK_QUERY[k] } } as const,
      }));

  return (
    <section aria-labelledby="home-categories" className="re-shell mt-16">
      <SectionHeader
        id="home-categories"
        index={index}
        title={copy?.title || t("home.categoriesHeading")}
        subtitle={copy?.subtitle || t("home.categoriesSub")}
        action={<AllLink href={copy?.cta?.href || "/categories"}>{copy?.cta?.label || t("home.categoriesAll")}</AllLink>}
      />
      <ul className={`${tileGrid} mt-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4`}>
        {rows.map((r) => {
          const Icon = r.icon ? PART_ICONS[r.icon] : null;
          return (
            <li key={r.key} className="bg-re-paper">
              <Link
                href={r.href}
                className="group flex h-full min-h-20 items-center gap-4 px-4 py-4 transition-colors duration-150 hover:bg-re-steel-50"
              >
                <span className="grid size-12 shrink-0 place-items-center border border-re-steel-200 bg-re-paper text-re-ink transition-colors duration-150 group-hover:border-re-ink">
                  {Icon ? <Icon className="size-7" /> : <span className="re-mono text-xs text-re-steel-400">RE</span>}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-re-ink group-hover:text-re-red-text">{r.name}</span>
                  {r.meta && <span className="re-mono text-[0.75rem] text-re-steel-600">{r.meta}</span>}
                </span>
              </Link>
            </li>
          );
        })}
        <AllTile
          href={copy?.cta?.href || "/categories"}
          label={copy?.cta?.label || t("home.categoriesAll")}
          className={fillSpan(rows.length, { base: 1, xs: 2, lg: 4 })}
        />
      </ul>
    </section>
  );
}

export function FeaturedParts({ parts, copy, index }: { parts: PartSummary[]; copy?: HomeCopy | null; index: string }) {
  const t = useTranslations("home");
  if (parts.length === 0) return null;
  return (
    <section aria-labelledby="home-featured" className="re-shell mt-16">
      <SectionHeader
        id="home-featured"
        index={index}
        title={copy?.title || t("featuredHeading")}
        subtitle={copy?.subtitle || copy?.body || t("featuredSub")}
        action={<AllLink href={copy?.cta?.href || "/categories"}>{copy?.cta?.label || t("featuredAll")}</AllLink>}
      />
      <PartsTable parts={parts} caption={t("featuredCaption")} showFits={false} className="mt-6" />
    </section>
  );
}

/** "How quoting works" — three steps as one spec-sheet strip. */
export function QuoteSteps({
  copy,
  index,
  whatsappHref,
}: {
  copy?: HomeCopy | null;
  index: string;
  whatsappHref: string;
}) {
  const t = useTranslations("home.quote");
  const steps = ["1", "2", "3"] as const;
  return (
    <section aria-labelledby="home-quote" className="re-shell mt-16">
      <SectionHeader id="home-quote" index={index} title={copy?.title || t("heading")} subtitle={copy?.subtitle || t("sub")} />
      <ScrollStage scene="rule">
        <ol className="mt-6 grid border border-re-ink md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s}
              className="relative border-re-ink p-5 not-last:border-b md:not-last:border-r md:not-last:border-b-0 sm:p-6"
            >
              <span
                aria-hidden
                data-rule
                className={`absolute inset-x-0 top-0 h-[3px] ${i === 2 ? "bg-re-red" : "bg-re-ink"}`}
              />
              <div className="flex items-baseline justify-between gap-3">
                <span className="re-mono text-[2.5rem] leading-none font-semibold text-re-ink">{`0${s}`}</span>
                <span className="re-label text-right">{t(`steps.${s}.spec`)}</span>
              </div>
              <h3 className="mt-5 text-[1.25rem] text-re-ink">{t(`steps.${s}.title`)}</h3>
              <p className="mt-2 text-[0.9375rem] text-re-steel-600">{t(`steps.${s}.body`)}</p>
            </li>
          ))}
        </ol>
      </ScrollStage>
      {copy?.body && <p className="mt-4 max-w-2xl text-re-steel-600">{copy.body}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={copy?.cta?.href || "/rfq"} className={buttonClass({ variant: "primary", size: "lg" })}>
          <FileSpreadsheet aria-hidden strokeWidth={1.75} />
          {copy?.cta?.label || t("cta")}
        </Link>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp", size: "lg" })}>
            <WhatsAppIcon />
            {t("whatsapp")}
          </a>
        )}
      </div>
    </section>
  );
}

/** Facts only: a spec strip (experience · BIN · area · hours, config/business),
 *  address/phone from settings, delivery + payment + grades from messages. */
export function TrustFacts({ settings, index, tel }: { settings: SiteSettings; index: string; tel: string }) {
  const t = useTranslations("home.trust");
  const tb = useTranslations("business");
  const hours = useHoursShort();
  const strip = [
    { label: tb("experienceLabel"), value: tb("experience"), mono: false },
    { label: tb("vatRegistered"), value: `BIN ${BUSINESS.vatBin}`, mono: true },
    { label: t("address"), value: tb("area"), mono: false },
    { label: tb("hours"), value: hours, mono: false },
  ];
  const pay = [...(settings.codEnabled ? (["cod"] as const) : []), "bkash", "nagad", "bank"] as const;
  const cell = "bg-re-paper p-5 sm:p-6";
  const head = "flex items-center gap-2 re-label";
  return (
    <section aria-labelledby="home-trust" className="re-shell mt-16">
      <SectionHeader
        id="home-trust"
        index={index}
        title={t("heading")}
        subtitle={t("sub")}
        action={<AllLink href="/about">{t("about")}</AllLink>}
      />
      <dl className="mt-6 grid grid-cols-2 border-y border-re-ink lg:grid-cols-4" data-testid="trust-strip">
        {strip.map((f, i) => (
          <div
            key={f.label}
            className={`px-3 py-3 sm:px-5 ${i % 2 ? "border-l border-re-steel-200" : ""} ${i > 1 ? "border-t border-re-steel-200 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <dt className="re-label">{f.label}</dt>
            <dd className={`mt-1 font-semibold text-re-ink ${f.mono ? "re-mono text-[0.875rem] whitespace-nowrap sm:text-[1rem]" : "text-[1rem]"}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-px border border-re-steel-200 bg-re-steel-200 md:grid-cols-2 lg:grid-cols-4">
        <div className={cell}>
          <p className={head}>
            <MapPin aria-hidden className="size-4 text-re-red" strokeWidth={1.75} />
            {t("address")}
          </p>
          <address className="mt-3 not-italic whitespace-pre-line text-re-ink">{settings.businessAddress}</address>
          {settings.contactPhone && (
            <>
              <p className={`${head} mt-5`}>
                <Phone aria-hidden className="size-4 text-re-red" strokeWidth={1.75} />
                {t("phone")}
              </p>
              <a href={tel} className="re-mono mt-2 inline-flex min-h-11 items-center text-[1.0625rem] font-semibold text-re-ink hover:text-re-blue">
                {settings.contactPhone}
              </a>
            </>
          )}
          <p className={`${head} mt-5`}>
            <Clock aria-hidden className="size-4 text-re-red" strokeWidth={1.75} />
            {t("hours")}
          </p>
          <HoursTable className="mt-2 text-[0.875rem]" />
        </div>
        <div className={cell}>
          <p className={head}>
            <Truck aria-hidden className="size-4 text-re-red" strokeWidth={1.75} />
            {t("delivery")}
          </p>
          <p className="mt-3 text-[0.9375rem] text-re-ink">{t("deliveryBody")}</p>
        </div>
        <div className={cell}>
          <p className={head}>
            <Wallet aria-hidden className="size-4 text-re-red" strokeWidth={1.75} />
            {t("payment")}
          </p>
          <ul className="mt-3 space-y-1.5 text-[0.9375rem] text-re-ink">
            {pay.map((k) => (
              <li key={k} className="flex items-center gap-2">
                <Check aria-hidden className="size-4 shrink-0 text-re-stock-in" strokeWidth={2} />
                {t(k)}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Check aria-hidden className="size-4 shrink-0 text-re-stock-in" strokeWidth={2} />
              {t("invoice")}
            </li>
          </ul>
        </div>
        <div className={cell}>
          <p className="re-label">{t("gradesHeading")}</p>
          <dl className="mt-3 space-y-3 text-[0.875rem] text-re-steel-600">
            <div>
              <dt>
                <Badge grade="genuine" />
              </dt>
              <dd className="mt-1">{t("genuine")}</dd>
            </div>
            <div>
              <dt>
                <Badge grade="compatible" />
              </dt>
              <dd className="mt-1">{t("compatible")}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.8125rem] font-semibold text-re-ink">{t("gradesNote")}</p>
        </div>
      </div>
    </section>
  );
}
