import { Camera, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getBootstrap, searchParts } from "@/lib/api/site";
import type { PartSummary } from "@/lib/api/types";
import { looksLikePartNumber } from "@/lib/part-number";
import { isDirect } from "@/lib/sales";
import { telHref, whatsappHref } from "@/lib/format";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PartNumber } from "@/components/ui/PartNumber";
import { StockBadge } from "@/components/ui/StockBadge";
import { Price } from "@/components/ui/Price";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppIcon } from "@/components/icons/brand";
import { QuotePartNumberLink } from "@/components/rfq/QuotePartNumberLink";
import { PartRow } from "@/components/catalog/PartCard";

/**
 * Search results, rendered on the server in the page response (no Suspense
 * boundary — streamed content stays hidden without JS). An exact
 * part-number hit is pinned in its own block above the table.
 */
export async function SearchResultsView({ locale, query }: { locale: Locale; query: string }) {
  const q = query.trim();
  const [t, res, boot] = await Promise.all([getTranslations({ locale }), searchParts(locale, q), getBootstrap(locale)]);
  const number = boot.settings.whatsappNumber || boot.settings.contactPhone;
  const directOn = boot.settings.directOrdersEnabled;
  const priceOf = (p: PartSummary) => (isDirect(p, directOn) ? p.price : null);
  const tel = telHref(boot.settings.contactPhone);

  if (!q) return <p className="mt-8 text-re-steel-600">{t("search.empty")}</p>;

  const columns: Column<PartSummary>[] = [
    {
      key: "part",
      header: t("ui.partNumber"),
      cell: (p) => (p.partNumber ? <PartNumber value={p.partNumber} size="sm" /> : <span className="re-mono text-re-steel-400">—</span>),
      width: "w-56",
    },
    {
      key: "name",
      header: t("search.part"),
      primary: true,
      cell: (p) => (
        <Link href={`/parts/${p.slug}`} className="font-semibold text-re-ink hover:text-re-blue hover:underline">
          {p.name}
          {p.brandName && <span className="ml-2 text-[0.8125rem] font-normal text-re-steel-600">{p.brandName}</span>}
        </Link>
      ),
    },
    { key: "stock", header: t("search.stock"), cell: (p) => <StockBadge availability={p.availability} />, width: "w-36" },
    { key: "price", header: t("search.price"), align: "right", cell: (p) => <Price amount={priceOf(p)} size="sm" />, width: "w-40" },
    {
      key: "cta",
      header: <span className="sr-only">{t("ui.addToQuote")}</span>,
      align: "right",
      cell: (p) => (
        <span className="inline-flex flex-wrap justify-end gap-2">
          <AddToCartButton salesMode={p.salesMode} directOrdersEnabled={directOn} price={p.price} productSlug={p.slug} partNumber={p.partNumber} name={p.name} size="sm" />
          <AddToQuoteButton productSlug={p.slug} partNumber={p.partNumber} name={p.name} size="sm" />
        </span>
      ),
      width: "w-52",
    },
  ];

  const total = res.parts.length + (res.exact ? 1 : 0);
  const suggestions = res.machineModels.length > 0 || res.machineBrands.length > 0;

  return (
    <div className="mt-6 space-y-8 md:mt-8 md:space-y-10">
      <p className="flex flex-wrap items-baseline justify-between gap-2 border-b border-re-steel-200 pb-3">
        <span className="text-lg font-semibold">{t("search.resultsFor", { query: q })}</span>
        <span className="re-mono text-sm text-re-steel-600">{t("search.count", { count: total })}</span>
      </p>

      {res.exact && (
        <section aria-labelledby="exact-match" className="border-2 border-re-ink" data-testid="exact-match">
          <h2 id="exact-match" className="flex items-center gap-2 bg-re-ink px-4 py-2 text-[0.875rem] font-semibold text-white">
            <span aria-hidden className="inline-block size-2.5 bg-re-red" />
            {t("search.exactMatch")}
          </h2>
          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
            <div className="min-w-0">
              {res.exact.partNumber && <PartNumber value={res.exact.partNumber} size="lg" />}
              <p className="mt-2 text-[1.125rem] font-semibold">
                <Link href={`/parts/${res.exact.slug}`} className="hover:text-re-blue hover:underline">
                  {res.exact.name}
                </Link>
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.875rem] text-re-steel-600">
                <StockBadge availability={res.exact.availability} />
                {res.exact.brandName && <span>{res.exact.brandName}</span>}
                {res.exact.categoryName && <span>{res.exact.categoryName}</span>}
                <Price amount={priceOf(res.exact)} size="sm" />
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">
              <AddToCartButton salesMode={res.exact.salesMode} directOrdersEnabled={directOn} price={res.exact.price} productSlug={res.exact.slug} partNumber={res.exact.partNumber} name={res.exact.name} />
              <AddToQuoteButton productSlug={res.exact.slug} partNumber={res.exact.partNumber} name={res.exact.name} className="max-sm:h-12" />
              <Link href={`/parts/${res.exact.slug}`} className={buttonClass({ variant: "ghost" })}>
                {t("search.viewPart")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {suggestions && (
        <section aria-labelledby="search-machines">
          <h2 id="search-machines" className="re-label">
            {t("search.machines")}
          </h2>
          <ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {res.machineBrands.map((b) => (
              <li key={`b-${b.slug}`}>
                <Link href={`/machines/${b.slug}`} className="inline-flex min-h-11 items-center gap-2 border border-re-ink px-3 text-[0.9375rem] font-semibold whitespace-nowrap hover:bg-re-ink hover:text-white">
                  {b.name}
                  <span className="re-mono text-[0.75rem] font-normal opacity-70">{t("search.models", { count: b.modelCount })}</span>
                </Link>
              </li>
            ))}
            {res.machineModels.map((m) => (
              <li key={`m-${m.slug}`}>
                <Link
                  href={`/machines/${m.brandSlug}/${m.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 border border-re-steel-500 px-3 text-[0.9375rem] whitespace-nowrap hover:border-re-ink"
                >
                  <span className="text-re-steel-600">{m.brandName}</span>
                  <span className="re-mono font-semibold">{m.name}</span>
                  {m.partsCount > 0 && <span className="re-mono text-[0.75rem] text-re-steel-600">{t("search.count", { count: m.partsCount })}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {res.parts.length > 0 && (
        <section aria-label={t("search.resultsFor", { query: q })}>
          {res.exact && <h2 className="re-label mb-3">{t("search.related")}</h2>}
          <DataTable className="max-md:hidden" columns={columns} rows={res.parts} rowKey={(p) => p.slug} caption={t("search.resultsFor", { query: q })} />
          <ul aria-label={t("search.resultsFor", { query: q })} className="divide-y divide-re-steel-200 border-y border-re-steel-200 md:hidden">
            {res.parts.map((p) => (
              <li key={p.slug}>
                <PartRow part={p} direct={isDirect(p, directOn)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {total === 0 && (
        <div className="max-w-2xl border border-re-steel-200 p-5 sm:p-6" data-testid="search-empty">
          <p className="text-lg font-semibold">{t("search.noResults", { query: q })}</p>
          <p className="mt-2 text-re-steel-600">{t("search.noResultsHelp")}</p>
          <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto max-sm:[&>*]:h-auto max-sm:[&>*]:min-h-12 max-sm:[&>*]:py-2 max-sm:[&>*]:text-center max-sm:[&>*]:whitespace-normal">
            {whatsappHref(number) ? (
              <a href={whatsappHref(number, t("search.waPhoto", { query: q }))} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp", size: "lg" }, "sm:h-11 sm:text-sm")}>
                <WhatsAppIcon />
                <Camera aria-hidden className="-ml-1 size-4" />
                {t("search.sendPhoto")}
              </a>
            ) : null}
            <QuotePartNumberLink partNumber={q} label={looksLikePartNumber(q) ? t("search.quoteNumber", { query: q }) : t("search.quoteIt")} />
            {tel && (
              <a href={tel} className={buttonClass({ variant: "ghost" }, "border border-re-steel-200")}>
                <Phone aria-hidden strokeWidth={1.75} />
                {t("catalog.listing.emptyCall")}
                <span className="re-mono font-normal">{boot.settings.contactPhone}</span>
              </a>
            )}
          </div>
          {!res.live && <p className="mt-4 text-[0.8125rem] text-re-steel-600">{t("search.offline")}</p>}
        </div>
      )}
    </div>
  );
}
