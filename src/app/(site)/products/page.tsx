import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import FilterRail from "@/components/catalog/FilterRail";
import MobileFilterDrawer from "@/components/catalog/MobileFilterDrawer";
import SortControl from "@/components/catalog/SortControl";
import ActiveFilters from "@/components/catalog/ActiveFilters";
import ProductGrid from "@/components/catalog/ProductGrid";
import Pagination from "@/components/catalog/Pagination";
import {
  storefront,
  type ProductQuery as StorefrontProductQuery,
  type ProductFacets,
} from "@/lib/storefront";
import type { Product } from "@/types";

export const metadata: Metadata = {
  title: "Shop parts",
  description:
    "Genuine and aftermarket spare parts for Juki, Brother, Yamato, Pegasus, Siruba and Kansai industrial sewing machines.",
};

type SearchParams = { [key: string]: string | string[] | undefined };

interface NormalisedQuery {
  q?: string;
  category?: string;
  brand?: string;
  machineBrand?: string;
  machineModel?: string;
  machineType?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  sort: string;
  page: number;
  pageSize: number;
}

const SORT_TO_DJANGO: Record<string, string | undefined> = {
  featured: "-rating",
  newest: "-created_at",
  "price-asc": "price",
  "price-desc": "-price",
  rating: "-rating",
  popular: "-review_count",
};

function flatten(sp: SearchParams): NormalisedQuery {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const num = (k: string) => {
    const v = get(k);
    return v && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  return {
    q: get("q") || undefined,
    category: get("category") || undefined,
    brand: get("brand") || undefined,
    machineBrand: get("machineBrand") || undefined,
    machineModel: get("machineModel") || undefined,
    machineType: get("machineType") || undefined,
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    onSale: get("onSale") === "true" || undefined,
    sort: get("sort") || "featured",
    page: num("page") ?? 1,
    pageSize: num("pageSize") ?? 24,
  };
}

function countActiveFilters(q: NormalisedQuery): number {
  let n = 0;
  if (q.category) n++;
  if (q.brand) n++;
  if (q.machineBrand) n++;
  if (q.machineModel) n++;
  if (q.machineType) n++;
  if (q.minPrice != null) n++;
  if (q.maxPrice != null) n++;
  if (q.onSale) n++;
  if (q.q) n++;
  return n;
}

const EMPTY_FACETS: ProductFacets = {
  machineBrands: [],
  categories: [],
  partsBrands: [],
  machineTypes: [],
  price: { min: 0, max: 0 },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = flatten(sp);

  const djangoQuery: StorefrontProductQuery = {
    search: query.q,
    category: query.category,
    brand: query.brand,
    machineBrand: query.machineBrand,
    machineModel: query.machineModel,
    machineType: query.machineType,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    ordering: SORT_TO_DJANGO[query.sort],
    page: query.page,
    page_size: query.pageSize,
  };

  let serverItems: Product[] = [];
  let total = 0;
  let facets: ProductFacets = EMPTY_FACETS;
  let serverError: string | null = null;

  try {
    const [productsRes, facetsRes] = await Promise.all([
      storefront.products.list(djangoQuery),
      storefront.products.facets(),
    ]);
    serverItems = productsRes.items;
    total = productsRes.total;
    facets = facetsRes;
  } catch (e) {
    serverError = (e as Error).message;
  }

  // On-sale filtering is a cheap client-side refinement over the fetched page.
  const filtered = query.onSale
    ? serverItems.filter((p) => p.compareAtPrice !== undefined && p.compareAtPrice > p.price)
    : serverItems;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <Suspense fallback={null}>
      <CatalogHeader total={total} sort={query.sort} />

      <div className="shell pb-24 md:pb-40">
        {serverError && (
          <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6">
            Couldn&apos;t load parts: {serverError}
          </div>
        )}

        <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <FilterRail facets={facets} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-navy/10">
              <MobileFilterDrawer
                facets={facets}
                activeFilterCount={countActiveFilters(query)}
              />
              <div className="hidden lg:block text-[11px] tracking-[0.25em] uppercase text-ink/55 tabular">
                {total} parts
              </div>
              <SortControl />
            </div>

            <div className="py-5">
              <ActiveFilters facets={facets} />
            </div>

            <ProductGrid products={filtered} />

            <Pagination
              page={query.page}
              totalPages={totalPages}
              total={total}
              pageSize={query.pageSize}
            />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
