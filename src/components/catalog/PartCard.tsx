import { Link } from "@/i18n/navigation";
import type { PartSummary } from "@/lib/api/types";
import { PartNumber } from "@/components/ui/PartNumber";
import { StockBadge } from "@/components/ui/StockBadge";
import { Price } from "@/components/ui/Price";
import { Badge, type PartGrade } from "@/components/ui/Badge";
import { AddToQuoteButton } from "@/components/ui/AddToQuoteButton";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { cn } from "@/lib/utils";
import { CatalogImage } from "./CatalogImage";

/** Genuine = the parts brand is the OEM; null (unknown) shows no badge. */
export function gradeFor(isOem: boolean | null): PartGrade | null {
  if (isOem === null) return null;
  return isOem ? "genuine" : "compatible";
}

/** Card-wide tap target: the part link's ::after covers the card; controls sit above it. */
const stretched = "after:absolute after:inset-0 after:content-['']";
const above = "relative z-10";

/**
 * Phone listing row, built for one thumb: photo · part number (copy) ·
 * name · grade · stock, and a 44px "Add to quote" square at the thumb's
 * resting point. The whole card opens the part. Prices only for direct parts.
 */
export function PartRow({ part: p, direct, id }: { part: PartSummary; direct: boolean; id?: string }) {
  const grade = gradeFor(p.brandIsOem);
  return (
    <article id={id} className="relative grid scroll-mt-4 grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-x-3 py-3 active:bg-re-steel-50">
      <CatalogImage
        src={p.image}
        alt=""
        sizes="72px"
        hint={`${p.categorySlug} ${p.categoryName}`}
        className="size-[4.5rem] border border-re-steel-200"
      />
      <div className="min-w-0">
        {p.partNumber ? (
          <PartNumber value={p.partNumber} size="sm" className={cn(above, "max-w-full [&_.re-mono]:truncate")} />
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug font-semibold text-re-ink bn:leading-normal">
          <Link href={`/parts/${p.slug}`} className={cn("focus-visible:outline-offset-0", stretched)}>
            {p.name}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.8125rem] text-re-steel-600">
          {grade && <Badge grade={grade} className="h-5" />}
          <StockBadge availability={p.availability} />
          {p.brandName && <span className="max-w-[9rem] truncate">{p.brandName}</span>}
        </p>
        {direct && p.price !== null && (
          <div className="mt-1">
            <Price amount={p.price} size="sm" />
          </div>
        )}
      </div>
      <div className={cn(above, "flex flex-col items-end justify-between gap-2 self-stretch")}>
        <AddToQuoteButton
          iconOnly
          productSlug={p.slug}
          partNumber={p.partNumber}
          name={p.name}
          qty={p.minOrderQuantity}
          variant={direct ? "secondary" : "primary"}
        />
        {direct && (
          <AddToCartButton
            iconOnly
            salesMode="direct"
            directOrdersEnabled
            price={p.price}
            productSlug={p.slug}
            partNumber={p.partNumber}
            name={p.name}
          />
        )}
      </div>
    </article>
  );
}

/**
 * Carousel tile (related / featured parts on phones): photo, part number,
 * name, grade + stock and a full-width Add to quote.
 */
export function PartTile({ part: p, direct }: { part: PartSummary; direct: boolean }) {
  const grade = gradeFor(p.brandIsOem);
  return (
    <article className="relative flex h-full flex-col border border-re-steel-200 bg-re-paper">
      <CatalogImage
        src={p.image}
        alt=""
        sizes="240px"
        hint={`${p.categorySlug} ${p.categoryName}`}
        className="aspect-[4/3] w-full border-b border-re-steel-200"
      />
      <div className="flex flex-1 flex-col p-3">
        {p.partNumber ? (
          <span translate="no" className="re-mono block truncate text-[0.875rem] font-semibold text-re-ink">
            {p.partNumber}
          </span>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug font-semibold text-re-ink bn:leading-normal">
          <Link href={`/parts/${p.slug}`} className={stretched}>
            {p.name}
          </Link>
        </h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {grade && <Badge grade={grade} className="h-5" />}
          <StockBadge availability={p.availability} />
        </p>
        {direct && p.price !== null && (
          <div className="mt-1.5">
            <Price amount={p.price} size="sm" />
          </div>
        )}
        <div className={cn(above, "mt-auto pt-3")}>
          <AddToQuoteButton
            productSlug={p.slug}
            partNumber={p.partNumber}
            name={p.name}
            qty={p.minOrderQuantity}
            size="sm"
            variant={direct ? "secondary" : "primary"}
            className="h-11 w-full"
          />
        </div>
      </div>
    </article>
  );
}
