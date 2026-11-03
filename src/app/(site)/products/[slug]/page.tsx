import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storefront, StorefrontError } from "@/lib/storefront";
import ProductView from "@/components/catalog/ProductView";
import type { Product, Review, Category, Brand } from "@/types";

interface Params {
  params: Promise<{ slug: string }>;
}

async function loadProduct(slug: string): Promise<Product | null> {
  try {
    return await storefront.products.get(slug);
  } catch (e) {
    if (e instanceof StorefrontError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.shortDescription ?? product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? product.description.slice(0, 160),
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductDetailPage({ params }: Params) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const [reviews, allProducts, category, brand]: [
    Review[],
    { items: Product[] },
    Category | null,
    Brand | null,
  ] = await Promise.all([
    storefront.products.reviews(slug).catch(() => []),
    storefront.products
      .list({ category: product.category, page_size: 8 })
      .catch(() => ({ items: [] as Product[] })) as Promise<{ items: Product[] }>,
    product.category
      ? storefront.categories.get(product.category).catch(() => null)
      : Promise.resolve(null),
    product.brand
      ? storefront.brands.get(product.brand).catch(() => null)
      : Promise.resolve(null),
  ]);

  const related = allProducts.items.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <ProductView
      product={product}
      initialReviews={reviews}
      related={related}
      categoryName={category?.name ?? product.category}
      brandName={brand?.name}
    />
  );
}
