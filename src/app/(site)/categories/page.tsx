import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { storefront } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Categories",
  description: "Shop the full catalog by category.",
};

export default async function CategoriesPage() {
  const categories = await storefront.categories.list().catch(() => []);

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
          /Shop · {String(categories.length).padStart(2, "0")} categories
        </p>
        <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
          Shop by <span className="italic">silhouette</span>.
        </h1>
        <p className="mt-6 max-w-xl text-ink/65 leading-relaxed">
          Every category in the house — built to the same atelier standard.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="shell py-24 text-center text-ink/55">
          No categories available yet.
        </div>
      ) : (
        <section className="shell pb-24 md:pb-32">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-6 md:gap-y-16">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group block"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-bone">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-cream flex items-end justify-between">
                    <div>
                      {c.gender && (
                        <p className="text-[10px] tracking-[0.3em] uppercase text-gold">
                          {c.gender}
                        </p>
                      )}
                      <h2 className="font-display text-3xl mt-1 leading-tight">
                        {c.name}
                      </h2>
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="text-gold transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
