import { getLocale, getTranslations } from "next-intl/server";
import { getBootstrap } from "@/lib/api/site";
import { isDirect } from "@/lib/sales";
import { Link } from "@/i18n/navigation";
import type { PartSummary } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PartNumber } from "@/components/ui/PartNumber";
import { StockBadge } from "@/components/ui/StockBadge";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { cn } from "@/lib/utils";
import { CatalogImage } from "./CatalogImage";
import { gradeFor, PartRow, PartTile } from "./PartCard";

export { gradeFor };

/**
 * The shared catalogue listing: a real table from md up (thumb · part no. ·
 * name/brand · fits · stock · price · add to quote). Phones get thumb-sized
 * card rows (PartRow) — or, with `mobile="carousel"`, a CSS scroll-snap
 * strip of tiles (no JS). Quote-first: prices render only for direct parts,
 * and the cart button (the only client prop that could carry a price) is
 * mounted only for them.
 *
 * `mobileParts` lets a paged listing show every row loaded so far on phones
 * ("Load more" appends) while the desktop table shows only the current page;
 * `anchorIndex` puts `id="more"` on the first newly loaded row.
 */
export async function PartsTable({
  parts,
  caption,
  showFits = true,
  className,
  mobile = "rows",
  mobileParts,
  anchorIndex,
}: {
  parts: PartSummary[];
  caption: string;
  showFits?: boolean;
  className?: string;
  mobile?: "rows" | "carousel";
  mobileParts?: PartSummary[];
  anchorIndex?: number;
}) {
  const locale = await getLocale();
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const directOn = boot.settings.directOrdersEnabled;
  const direct = (p: PartSummary) => isDirect(p, directOn);
  const anyDirect = parts.some(direct);

  const name = (p: PartSummary) => {
    const grade = gradeFor(p.brandIsOem);
    return (
      <span className="flex min-w-0 items-start gap-3 md:min-w-[9rem] xl:min-w-[11rem]">
        <span className="min-w-0">
          <Link
            href={`/parts/${p.slug}`}
            className="font-semibold leading-snug text-re-ink underline-offset-2 hover:text-re-blue hover:underline"
          >
            {p.name}
          </Link>
          {(p.brandName || grade) && (
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-re-steel-600">
              {p.brandName && <span>{p.brandName}</span>}
              {grade && <Badge grade={grade} />}
            </span>
          )}
        </span>
      </span>
    );
  };

  const columns: Column<PartSummary>[] = [
    {
      key: "thumb",
      header: <span className="sr-only">{t("catalog.listing.colImage")}</span>,
      hideOnMobile: true,
      desktopFrom: "xl",
      width: "w-20",
      cell: (p) => (
        <CatalogImage
          src={p.image}
          alt=""
          sizes="64px"
          hint={`${p.categorySlug} ${p.categoryName}`}
          className="size-14 border border-re-steel-200"
        />
      ),
    },
    {
      key: "part",
      header: t("ui.partNumber"),
      width: "w-44",
      cell: (p) =>
        p.partNumber ? <PartNumber value={p.partNumber} size="sm" className="whitespace-nowrap" /> : <span className="re-mono text-re-steel-400">—</span>,
    },
    { key: "name", header: t("catalog.listing.colName"), cell: (p) => name(p) },
    ...(showFits
      ? [
          {
            key: "fits",
            header: t("catalog.listing.colFits"),
            desktopFrom: "xl",
            width: "w-24",
            cell: (p: PartSummary) => (
              <span className="re-mono whitespace-nowrap text-[0.875rem] text-re-steel-600">
                {t("catalog.listing.fits", { count: p.fitsCount })}
              </span>
            ),
          } satisfies Column<PartSummary>,
        ]
      : []),
    {
      key: "stock",
      header: t("catalog.listing.colStock"),
      width: "w-32",
      cell: (p) => <StockBadge availability={p.availability} className="whitespace-nowrap" />,
    },
    {
      key: "price",
      header: t("catalog.listing.colPrice"),
      align: "right",
      // Every row "on request": the column only earns its width on wide screens.
      ...(anyDirect ? {} : { desktopFrom: "xl" as const }),
      width: "w-28",
      cell: (p) => <Price amount={direct(p) ? p.price : null} size="sm" />,
    },
    {
      key: "cta",
      header: <span className="sr-only">{t("ui.addToQuote")}</span>,
      align: "right",
      mobileFull: true,
      width: anyDirect ? "w-48" : "w-40",
      cell: (p) => (
        <span className="flex flex-wrap justify-stretch gap-2 md:flex-col md:items-end [&>*]:flex-1 md:[&>*]:flex-none">
          {direct(p) && (
            <AddToCartButton
              salesMode="direct"
              directOrdersEnabled
              price={p.price}
              productSlug={p.slug}
              partNumber={p.partNumber}
              name={p.name}
              size="sm"
              className="min-h-11 md:min-h-9"
            />
          )}
          <AddToQuoteButton
            productSlug={p.slug}
            partNumber={p.partNumber}
            name={p.name}
            qty={p.minOrderQuantity}
            size="sm"
            variant={direct(p) ? "secondary" : "primary"}
            className="min-h-11 md:min-h-9"
          />
        </span>
      ),
    },
  ];

  const phoneRows = mobileParts ?? parts;
  return (
    <div className={className}>
      <DataTable className="max-md:hidden" columns={columns} rows={parts} rowKey={(p) => p.slug} caption={caption} />
      {mobile === "carousel" ? (
        <ul
          aria-label={caption}
          className={cn(
            "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 md:hidden",
            "[scrollbar-width:thin]",
          )}
        >
          {phoneRows.map((p) => (
            <li key={p.slug} className="w-[min(15rem,72vw)] shrink-0 snap-start">
              <PartTile part={p} direct={direct(p)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-label={caption} className="divide-y divide-re-steel-200 border-y border-re-steel-200 md:hidden">
          {phoneRows.map((p, i) => (
            <li key={p.slug}>
              <PartRow part={p} direct={direct(p)} id={i === anchorIndex && i > 0 ? "more" : undefined} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
