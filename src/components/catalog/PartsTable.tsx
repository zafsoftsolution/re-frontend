import { getLocale, getTranslations } from "next-intl/server";
import { getBootstrap } from "@/lib/api/site";
import { isDirect } from "@/lib/sales";
import { Link } from "@/i18n/navigation";
import type { PartSummary } from "@/lib/api/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PartNumber } from "@/components/ui/PartNumber";
import { StockBadge } from "@/components/ui/StockBadge";
import { Price } from "@/components/ui/Price";
import { Badge, type PartGrade } from "@/components/ui/Badge";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { CatalogImage } from "./CatalogImage";

/** Genuine = the parts brand is the OEM; null (unknown) shows no badge. */
export function gradeFor(isOem: boolean | null): PartGrade | null {
  if (isOem === null) return null;
  return isOem ? "genuine" : "compatible";
}

/**
 * The shared catalogue listing: a real table from md up (thumb · part no. ·
 * name/brand · fits · stock · price · add to quote), labelled cards on
 * phones. Quote-first: prices render only for direct parts, and the cart
 * button (the only client prop that could carry a price) is mounted only
 * for them.
 */
export async function PartsTable({
  parts,
  caption,
  showFits = true,
  className,
}: {
  parts: PartSummary[];
  caption: string;
  showFits?: boolean;
  className?: string;
}) {
  const locale = await getLocale();
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const directOn = boot.settings.directOrdersEnabled;
  const direct = (p: PartSummary) => isDirect(p, directOn);
  const anyDirect = parts.some(direct);

  const name = (p: PartSummary, withThumb: boolean) => {
    const grade = gradeFor(p.brandIsOem);
    return (
      <span className={`flex min-w-0 items-start gap-3 ${withThumb ? "" : "md:min-w-[9rem] xl:min-w-[11rem]"}`}>
        {withThumb && (
          <CatalogImage
            src={p.image}
            alt=""
            sizes="64px"
            hint={`${p.categorySlug} ${p.categoryName}`}
            className="size-16 shrink-0 border border-re-steel-200"
          />
        )}
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
    // Desktop name cell; on phones the card title (below) carries the thumb.
    { key: "name", header: t("catalog.listing.colName"), hideOnMobile: true, cell: (p) => name(p, false) },
    { key: "title", header: t("catalog.listing.colName"), primary: true, hideOnDesktop: true, cell: (p) => name(p, true) },
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

  return <DataTable className={className} columns={columns} rows={parts} rowKey={(p) => p.slug} caption={caption} />;
}
