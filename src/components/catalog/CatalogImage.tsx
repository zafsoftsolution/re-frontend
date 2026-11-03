import Image from "next/image";
import { PART_ICONS, partIconFor } from "@/components/icons/parts";
import { imageSource } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Square catalogue image on a steel ground (parts photos are shot on white,
 * so `object-contain` + padding reads like a parts-book plate). With no
 * image, a technical part icon guessed from `hint` (category slug/name) —
 * never a fake photo.
 */
export function CatalogImage({
  src,
  alt,
  sizes,
  hint = "",
  preload = false,
  className,
  iconClassName,
}: {
  src: string | null | undefined;
  alt: string;
  /** next/image `sizes` — keep it honest so phones get small files. */
  sizes: string;
  hint?: string;
  /** Above-the-fold hero image (LCP): preload instead of lazy. */
  preload?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const source = imageSource(src);
  const iconKey = partIconFor(hint);
  const Icon = iconKey ? PART_ICONS[iconKey] : null;
  return (
    <span className={cn("relative block aspect-square overflow-hidden bg-re-steel-50", className)}>
      {source ? (
        <Image
          src={source.src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized={source.unoptimized}
          preload={preload}
          loading={preload ? undefined : "lazy"}
          className="object-contain p-[6%] mix-blend-multiply"
        />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-re-steel-400">
          {Icon ? <Icon className={cn("size-1/2", iconClassName)} /> : <span className="re-mono text-[0.625rem]">RE</span>}
        </span>
      )}
    </span>
  );
}
