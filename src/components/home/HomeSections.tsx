import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PART_ICONS, partIconFor, type PartIconKey } from "@/components/icons/parts";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { CategorySummary, MachineBrandSummary } from "@/lib/api/types";

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

const FALLBACK_PART_TYPES: PartIconKey[] = [
  "needle",
  "hook",
  "bobbinCase",
  "presserFoot",
  "feedDog",
  "servoMotor",
  "controlBox",
  "knife",
];

const tileGrid = "grid gap-px border border-re-steel-200 bg-re-steel-200";

export function MachineBrandTiles({ brands }: { brands: MachineBrandSummary[] }) {
  const t = useTranslations("home");
  const live = brands.length > 0;
  const tiles = live
    ? brands.slice(0, 12).map((b) => ({
        key: b.slug,
        name: b.name,
        country: b.country,
        meta: t("models", { count: b.modelCount }),
        href: `/machines/${b.slug}`,
      }))
    : FALLBACK_MACHINE_BRANDS.map((b) => ({
        key: b.name,
        name: b.name,
        country: b.country,
        meta: null,
        href: { pathname: "/search", query: { q: b.name } } as const,
      }));

  return (
    <section aria-labelledby="home-machines" className="re-shell mt-16">
      <SectionHeader
        id="home-machines"
        index="01"
        title={t("machinesHeading")}
        subtitle={t("machinesSub")}
        action={
          <Link href="/machines" className="inline-flex h-11 items-center gap-1.5 font-semibold text-re-blue hover:underline">
            {t("machinesAll")} <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
      />
      <ul className={`${tileGrid} mt-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`}>
        {tiles.map((b) => (
          <li key={b.key} className="bg-re-paper">
            <Link
              href={b.href}
              className="group flex h-full min-h-28 flex-col justify-between gap-4 p-4 transition-colors duration-150 hover:bg-re-steel-50 sm:p-5"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[1.375rem] leading-none font-extrabold text-re-ink [font-stretch:75%] group-hover:text-re-red-text sm:text-[1.625rem]">
                  {b.name}
                </span>
                {b.country && <span className="re-mono text-[0.6875rem] text-re-steel-600">{b.country}</span>}
              </span>
              <span className="flex items-center justify-between text-[0.8125rem] text-re-steel-600">
                <span>{b.meta}</span>
                <ArrowRight
                  aria-hidden
                  className="size-4 -translate-x-1 opacity-0 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryGrid({ categories }: { categories: CategorySummary[] }) {
  const t = useTranslations();
  const live = categories.length > 0;
  const rows = live
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
        href: { pathname: "/search", query: { q: k === "bobbinCase" ? "bobbin case" : k === "presserFoot" ? "presser foot" : k === "feedDog" ? "feed dog" : k === "servoMotor" ? "servo motor" : k === "controlBox" ? "control box" : k } } as const,
      }));

  return (
    <section aria-labelledby="home-categories" className="re-shell mt-16">
      <SectionHeader
        id="home-categories"
        index="02"
        title={t("home.categoriesHeading")}
        subtitle={t("home.categoriesSub")}
        action={
          <Link href="/categories" className="inline-flex h-11 items-center gap-1.5 font-semibold text-re-blue hover:underline">
            {t("home.categoriesAll")} <ArrowRight aria-hidden className="size-4" />
          </Link>
        }
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
                  {Icon ? <Icon className="size-7" /> : <span className="re-mono text-xs">—</span>}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-re-ink group-hover:text-re-red-text">{r.name}</span>
                  {r.meta && <span className="re-mono text-[0.75rem] text-re-steel-600">{r.meta}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
