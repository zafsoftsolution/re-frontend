import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LookbookDetail from "@/components/lookbook/LookbookDetail";
import { storefront, StorefrontError } from "@/lib/storefront";
import type { LookbookEntry, Product } from "@/types";

async function loadLookbook(slug: string): Promise<LookbookEntry | null> {
  try {
    return await storefront.lookbooks.get(slug);
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
  const lb = await loadLookbook(slug);
  if (!lb) return { title: "Lookbook not found" };
  return {
    title: `${lb.title} — ${lb.season}`,
    description: lb.description,
    openGraph: {
      title: `${lb.title} — ${lb.season} · Rakib Enterprise`,
      description: lb.description,
      images: [lb.coverImage],
    },
  };
}

export default async function LookbookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lookbook = await loadLookbook(slug);
  if (!lookbook) notFound();

  // Resolve the products this lookbook references, plus the full lookbook list
  // so we can compute previous/next links.
  const [allProducts, all] = await Promise.all([
    storefront.products.list({ page_size: 100 }),
    storefront.lookbooks.list(),
  ]);

  const productMap = new Map<string, Product>(
    allProducts.items.map((p) => [p.id, p]),
  );
  const products = (lookbook.productIds ?? [])
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p));

  const idx = all.findIndex((l) => l.slug === slug);
  const previous = idx > 0 ? all[idx - 1] : undefined;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;

  return (
    <LookbookDetail
      lookbook={lookbook}
      products={products}
      previous={previous}
      next={next}
    />
  );
}
