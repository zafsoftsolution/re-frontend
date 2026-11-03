import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { searchParts } from "@/lib/api/site";
import type { PartSummary } from "@/lib/api/types";
import { whatsappHref } from "@/lib/format";
import { SearchInput } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PartNumber } from "@/components/ui/PartNumber";
import { StockBadge } from "@/components/ui/StockBadge";
import { Price } from "@/components/ui/Price";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppIcon } from "@/components/icons/brand";
import { getBootstrap } from "@/lib/api/site";

export async function SearchResultsView({
  locale,
  searchParams,
  action,
}: {
  locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  action: string;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim();
  const [t, res, boot] = await Promise.all([
    getTranslations({ locale }),
    searchParts(locale, q),
    getBootstrap(locale),
  ]);
  const wa = whatsappHref(boot.settings.whatsappNumber || boot.settings.contactPhone, q ? `${t("ui.askWhatsapp")}: ${q}` : undefined);

  const columns: Column<PartSummary>[] = [
    {
      key: "part",
      header: t("ui.partNumber"),
      cell: (p) => (p.partNumber ? <PartNumber value={p.partNumber} size="sm" /> : <span className="re-mono text-re-steel-400">—</span>),
      width: "w-56",
    },
    {
      key: "name",
      header: t("search.title"),
      primary: true,
      cell: (p) => (
        <Link href={`/parts/${p.slug}`} className="font-semibold text-re-ink hover:text-re-blue hover:underline">
          {p.name}
          {p.brandName && <span className="ml-2 text-[0.8125rem] font-normal text-re-steel-600">{p.brandName}</span>}
        </Link>
      ),
    },
    { key: "stock", header: t("search.stock"), cell: (p) => <StockBadge availability={p.availability} />, width: "w-36" },
    { key: "price", header: t("search.price"), align: "right", cell: (p) => <Price amount={p.price} size="sm" />, width: "w-40" },
    {
      key: "cta",
      header: <span className="sr-only">{t("ui.addToQuote")}</span>,
      align: "right",
      cell: (p) => (
        <span className="inline-flex flex-wrap justify-end gap-2">
          <AddToCartButton salesMode={p.salesMode} price={p.price} productSlug={p.slug} partNumber={p.partNumber} name={p.name} size="sm" />
          <AddToQuoteButton productSlug={p.slug} partNumber={p.partNumber} name={p.name} size="sm" />
        </span>
      ),
      width: "w-52",
    },
  ];

  const rows = res.exact ? [res.exact, ...res.parts] : res.parts;

  return (
    <>
      <SearchInput
        action={action}
        label={t("header.searchLabel")}
        placeholder={t("header.searchPlaceholder")}
        submitLabel={t("header.searchSubmit")}
        defaultValue={q}
        size="lg"
        className="mt-6 max-w-3xl"
      />

      {!q && <p className="mt-8 text-re-steel-600">{t("search.empty")}</p>}

      {q && rows.length === 0 && (
        <div className="mt-8 max-w-2xl border border-re-steel-200 p-6">
          <p className="text-lg font-semibold">{t("search.noResults", { query: q })}</p>
          <p className="mt-2 text-re-steel-600">{t("search.noResultsHelp")}</p>
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp" }, "mt-5")}>
              <WhatsAppIcon />
              {t("ui.askWhatsapp")}
            </a>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-lg font-semibold">{t("search.resultsFor", { query: q })}</span>
            <span className="re-mono text-sm text-re-steel-600">{t("search.count", { count: rows.length })}</span>
          </p>
          {res.exact && (
            <p className="mb-2 inline-flex items-center gap-2 bg-re-ink px-2 py-1 text-[0.8125rem] font-semibold text-white">
              {t("search.exactMatch")}
            </p>
          )}
          <DataTable columns={columns} rows={rows} rowKey={(p) => p.slug} caption={t("search.resultsFor", { query: q })} />
        </div>
      )}
    </>
  );
}
