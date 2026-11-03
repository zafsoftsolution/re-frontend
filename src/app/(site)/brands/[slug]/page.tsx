import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { storefront, StorefrontError } from "@/lib/storefront";
import ProductGrid from "@/components/catalog/ProductGrid";
import type { Brand } from "@/types";

async function loadBrand(slug: string): Promise<Brand | null> {
  try {
    return await storefront.brands.get(slug);
  } catch (e) {
    if (e instanceof StorefrontError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await loadBrand(slug);
  if (!brand) return { title: "Brand not found" };
  return {
    title: brand.name,
    description: brand.description ?? `${brand.name} at Rakib Enterprise`,
  };
}

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await loadBrand(slug);
  if (!brand) notFound();

  const { items: products, total } = await storefront.products.list({
    brand: slug,
    page_size: 36,
  });

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
              /Brand · {String(total).padStart(2, "0")} pieces
            </p>
            <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
              {brand.name}
            </h1>
            {brand.description && (
              <p className="mt-6 max-w-xl text-ink/65 leading-relaxed">
                {brand.description}
              </p>
            )}
          </div>
          {brand.logo && (
            <div className="h-32 w-32 shrink-0 grid place-items-center bg-bone p-6">
              <Image
                src={brand.logo}
                alt={brand.name}
                width={128}
                height={128}
                className="max-h-full w-auto object-contain"
              />
            </div>
          )}
        </div>
      </header>

      <section className="shell pb-24 md:pb-32">
        <ProductGrid products={products} />
      </section>
    </>
  );
}
