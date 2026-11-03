import type { ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { MachineBrandSummary, MachineModelSummary, PartSummary } from "@/lib/api/types";
import {
  applyListing,
  countBy,
  DEFAULT_SORT,
  hasActiveFilters,
  listingQuery,
  SORTS,
  type ListingParams,
} from "@/lib/catalog/listing";
import { localePath } from "@/lib/seo/metadata";
import { inputClass } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";
import { PartsTable } from "./PartsTable";
import { Pagination } from "./Pagination";
import { EmptyParts } from "./EmptyParts";
import { ListingForm } from "./ListingForm";
import { FilterSheet } from "./FilterSheet";

interface Option {
  value: string;
  label: string;
  count?: number;
}

function NativeSelect({
  name,
  label,
  value,
  anyLabel,
  options,
  groups,
}: {
  name: string;
  label: string;
  value: string;
  anyLabel: string;
  options?: Option[];
  groups?: { label: string; options: Option[] }[];
}) {
  const opt = (o: Option) => (
    <option key={o.value} value={o.value}>
      {o.count !== undefined ? `${o.label} (${o.count})` : o.label}
    </option>
  );
  return (
    <label className="block">
      <span className="re-label mb-1.5 block">{label}</span>
      <span className="relative block">
        <select name={name} defaultValue={value} className={cn(inputClass, "cursor-pointer appearance-none pr-9 text-[0.9375rem]")}>
          <option value="">{anyLabel}</option>
          {options?.map(opt)}
          {groups?.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map(opt)}
            </optgroup>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-re-steel-600" />
      </span>
    </label>
  );
}

/**
 * Shared filtered listing for category and parts-brand pages. The base set
 * (all parts in the category / of the brand) is filtered, sorted and paged
 * on the server from URL params — so every state is a shareable URL, works
 * without JS, and facet options only ever offer values that have parts.
 */
export async function ListingView({
  locale,
  basePath,
  parts,
  params,
  facet,
  machineBrands,
  machineModels,
  whatsapp,
  context,
}: {
  locale: Locale;
  /** Locale-less path of the listing, e.g. "/categories/needles". */
  basePath: string;
  parts: PartSummary[];
  params: ListingParams;
  /** The second facet besides the machine: parts brand or category. */
  facet: "brand" | "category";
  machineBrands: MachineBrandSummary[];
  machineModels: MachineModelSummary[];
  whatsapp: string;
  context: string;
}) {
  const t = await getTranslations({ locale, namespace: "catalog.listing" });
  const result = applyListing(parts, params);
  const action = localePath(basePath, locale);
  const href = (patch: Partial<ListingParams>) => ({ pathname: basePath, query: listingQuery(params, { page: 1, ...patch }) });

  // Facet options from the base set (counts = parts in the base set).
  const modelCounts = countBy(parts, (p) => p.machineModelSlugs);
  const brandCounts = countBy(parts, (p) => p.machineBrandSlugs);
  const modelsByBrand = new Map<string, Option[]>();
  for (const m of machineModels) {
    const count = modelCounts.get(m.slug);
    if (!count) continue;
    const list = modelsByBrand.get(m.brandSlug) ?? [];
    list.push({ value: m.slug, label: m.name, count });
    modelsByBrand.set(m.brandSlug, list);
  }
  const machineBrandOptions: Option[] = machineBrands
    .filter((b) => brandCounts.get(b.slug))
    .map((b) => ({ value: b.slug, label: b.name, count: brandCounts.get(b.slug) }));
  const modelGroups = machineBrands
    .filter((b) => modelsByBrand.has(b.slug) && (!params.mbrand || params.mbrand === b.slug))
    .map((b) => ({ label: b.name, options: modelsByBrand.get(b.slug)! }));

  const secondaryNames = new Map<string, string>();
  for (const p of parts) {
    if (facet === "brand" && p.brandSlug) secondaryNames.set(p.brandSlug, p.brandName || p.brandSlug);
    if (facet === "category" && p.categorySlug) secondaryNames.set(p.categorySlug, p.categoryName || p.categorySlug);
  }
  const secondaryCounts = countBy(parts, (p) => (facet === "brand" ? p.brandSlug : p.categorySlug));
  const secondaryOptions: Option[] = [...secondaryNames]
    .map(([value, label]) => ({ value, label, count: secondaryCounts.get(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const secondaryValue = facet === "brand" ? params.brand : params.category;

  const modelName = machineModels.find((m) => m.slug === params.machine);
  const chips: { key: string; label: string; remove: Partial<ListingParams> }[] = [];
  if (params.machine)
    chips.push({ key: "machine", label: modelName ? `${modelName.brandName} ${modelName.name}` : params.machine, remove: { machine: "" } });
  if (params.mbrand && !params.machine)
    chips.push({ key: "mbrand", label: machineBrands.find((b) => b.slug === params.mbrand)?.name ?? params.mbrand, remove: { mbrand: "" } });
  if (secondaryValue)
    chips.push({
      key: facet,
      label: secondaryNames.get(secondaryValue) ?? secondaryValue,
      remove: facet === "brand" ? { brand: "" } : { category: "" },
    });
  if (params.inStock) chips.push({ key: "stock", label: t("inStock"), remove: { inStock: false } });

  const fields = (idPrefix: string): ReactNode => (
    <div className="grid gap-4">
      {machineBrandOptions.length > 0 && (
        <NativeSelect name="mbrand" label={t("machineBrand")} anyLabel={t("anyMachineBrand")} value={params.mbrand} options={machineBrandOptions} />
      )}
      {modelGroups.length > 0 && (
        <NativeSelect name="machine" label={t("machineModel")} anyLabel={t("anyMachineModel")} value={params.machine} groups={modelGroups} />
      )}
      {secondaryOptions.length > 1 && (
        <NativeSelect
          name={facet}
          label={facet === "brand" ? t("partsBrand") : t("category")}
          anyLabel={facet === "brand" ? t("anyPartsBrand") : t("anyCategory")}
          value={secondaryValue}
          options={secondaryOptions}
        />
      )}
      <label htmlFor={`${idPrefix}-stock`} className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          id={`${idPrefix}-stock`}
          type="checkbox"
          name="stock"
          value="1"
          defaultChecked={params.inStock}
          className="size-5 shrink-0 accent-re-ink"
        />
        <span className="font-medium">{t("inStock")}</span>
      </label>
      <NativeSelect
        name="sort"
        label={t("sort")}
        anyLabel={t(`sort_${DEFAULT_SORT}`)}
        value={params.sort === DEFAULT_SORT ? "" : params.sort}
        options={SORTS.filter((s) => s !== DEFAULT_SORT).map((s) => ({ value: s, label: t(`sort_${s}`) }))}
      />
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" className={buttonClass({ variant: "secondary" })}>
          {t("apply")}
        </button>
        {hasActiveFilters(params) && (
          <Link href={basePath} className="inline-flex h-11 items-center font-semibold text-re-blue hover:underline">
            {t("clear")}
          </Link>
        )}
      </div>
    </div>
  );

  const activeCount = chips.length + (params.sort !== DEFAULT_SORT ? 1 : 0);

  return (
    <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <aside aria-labelledby="filters-heading" className="hidden md:block">
        <div className="sticky top-4 border-t border-re-ink pt-4">
          <h2 id="filters-heading" className="re-label mb-4 text-re-ink">
            {t("filters")}
          </h2>
          <ListingForm action={action} auto defaultSort={DEFAULT_SORT}>
            {fields("d")}
          </ListingForm>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-re-steel-200 pb-3">
          <p className="flex items-baseline gap-2" aria-live="polite">
            <span className="re-mono text-lg font-semibold text-re-ink">{result.total}</span>
            <span className="text-re-steel-600">{t("results", { count: result.total })}</span>
            {result.pageCount > 1 && (
              <span className="re-mono text-[0.8125rem] text-re-steel-600">· {t("pageOf", { page: result.page, pages: result.pageCount })}</span>
            )}
          </p>
          <div className="md:hidden">
            <FilterSheet label={t("filters")} title={t("filters")} closeLabel={t("close")} activeCount={activeCount}>
              <ListingForm action={action} defaultSort={DEFAULT_SORT}>
                {fields("m")}
              </ListingForm>
            </FilterSheet>
          </div>
        </div>
        {/* No-JS phones: the sheet can't open, so show the form inline. */}
        <noscript>
          <details className="mt-3 border border-re-steel-200 p-3 md:hidden">
            <summary className="min-h-11 cursor-pointer font-semibold">{t("filters")}</summary>
            <form action={action} method="get" className="mt-3">
              {fields("n")}
            </form>
          </details>
        </noscript>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("activeFilters")}>
            {chips.map((c) => (
              <li key={c.key}>
                <Link
                  href={href(c.remove)}
                  aria-label={t("removeFilter", { label: c.label })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-re border border-re-ink bg-re-paper px-2.5 text-[0.875rem] font-medium hover:bg-re-ink hover:text-white"
                >
                  {c.label}
                  <X aria-hidden className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {result.rows.length > 0 ? (
            <PartsTable parts={result.rows} caption={context} />
          ) : (
            <EmptyParts
              whatsapp={whatsapp}
              context={context}
              action={
                hasActiveFilters(params) ? (
                  <Link href={basePath} className={buttonClass({ variant: "secondary" })}>
                    {t("clear")}
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>

        <Pagination page={result.page} pageCount={result.pageCount} href={(page) => href({ page })} />
      </div>
    </div>
  );
}
