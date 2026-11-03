import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionDetail from "@/components/collections/CollectionDetail";
import { storefront, StorefrontError } from "@/lib/storefront";
import type { Collection } from "@/types";

async function loadCollection(slug: string): Promise<Collection | null> {
  try {
    return await storefront.collections.get(slug);
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
  const collection = await loadCollection(slug);
  if (!collection) return { title: "Collection not found" };
  return {
    title: `${collection.name} — ${collection.season}`,
    description: collection.description,
    openGraph: {
      title: `${collection.name} — ${collection.season} · Rakib Enterprise`,
      description: collection.description,
      images: [collection.heroImage],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await loadCollection(slug);
  if (!collection) notFound();

  const [productsRes, all] = await Promise.all([
    storefront.products.list({ collection: slug, page_size: 36 }),
    storefront.collections.list(),
  ]);

  const idx = all.findIndex((c) => c.slug === slug);
  const previous = idx > 0 ? all[idx - 1] : undefined;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;

  return (
    <CollectionDetail
      collection={collection}
      products={productsRes.items}
      previous={previous}
      next={next}
    />
  );
}
