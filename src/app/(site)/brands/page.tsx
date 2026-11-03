import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { storefront } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Brands",
  description: "House labels and partner brands carried at Rakib Enterprise.",
};

export default async function BrandsPage() {
  const brands = await storefront.brands.list().catch(() => []);

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
          /Brands · {String(brands.length).padStart(2, "0")} labels
        </p>
        <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
          The <span className="italic">collective</span>.
        </h1>
        <p className="mt-6 max-w-xl text-ink/65 leading-relaxed">
          Every label carried at Rakib Enterprise — from in-house atelier to invited guests.
        </p>
      </header>

      {brands.length === 0 ? (
        <div className="shell py-24 text-center text-ink/55">
          No brands available yet.
        </div>
      ) : (
        <section className="shell pb-24 md:pb-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-14">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/brands/${b.slug}`}
                className="group block"
              >
                <div className="relative aspect-square bg-bone grid place-items-center p-8 transition-colors group-hover:bg-navy/5">
                  {b.logo ? (
                    <Image
                      src={b.logo}
                      alt={b.name}
                      width={160}
                      height={160}
                      className="max-h-full w-auto object-contain"
                    />
                  ) : (
                    <span className="font-display text-2xl text-navy">
                      {b.name}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h2 className="font-display text-lg text-navy">{b.name}</h2>
                  <span className="text-[10px] tracking-[0.25em] uppercase text-ink/45 tabular">
                    {String(b.productCount).padStart(2, "0")} pieces
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
