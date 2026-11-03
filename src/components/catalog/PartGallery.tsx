"use client";

import { useState } from "react";
import Image from "next/image";
import type { ImageSource } from "@/lib/media";
import { cn } from "@/lib/utils";

/** Part photos: one large plate + thumbnail strip. First image is the LCP. */
export function PartGallery({ images, alt, thumbLabel }: { images: ImageSource[]; alt: string; thumbLabel: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden border border-re-steel-200 bg-re-steel-50">
        <Image
          key={current.src}
          src={current.src}
          alt={alt}
          fill
          sizes="(min-width: 64rem) 40vw, (min-width: 48rem) 50vw, 100vw"
          unoptimized={current.unoptimized}
          preload={active === 0}
          className="object-contain p-[5%] mix-blend-multiply"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-2 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${thumbLabel} ${i + 1}`}
                aria-pressed={i === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden border bg-re-steel-50 transition-colors duration-150",
                  i === active ? "border-re-ink" : "border-re-steel-200 hover:border-re-steel-600",
                )}
              >
                <Image src={img.src} alt="" fill sizes="80px" unoptimized={img.unoptimized} className="object-contain p-1 mix-blend-multiply" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
