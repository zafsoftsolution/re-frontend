import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, ArrowRight } from "lucide-react";
import {
  storefront,
  StorefrontError,
  type ProductQuery as StorefrontProductQuery,
  type ProductFacets,
} from "@/lib/storefront";
import type { Product, Category } from "@/types";
import FilterRail from "@/components/catalog/FilterRail";
import MobileFilterDrawer from "@/components/catalog/MobileFilterDrawer";
import SortControl from "@/components/catalog/SortControl";
import ActiveFilters from "@/components/catalog/ActiveFilters";
import ProductGrid from "@/components/catalog/ProductGrid";
import Pagination from "@/components/catalog/Pagination";

// ─────────────────────────────────────────────────────────────────────────────
// Search-param plumbing — same shape as /products so the URL semantics match.
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = { [key: string]: string | string[] | undefined };

interface NormalisedQuery {
  q?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Data loading
// ─────────────────────────────────────────────────────────────────────────────

async function loadCategory(slug: string): Promise<Category | null> {
  try {
    return await storefront.categories.get(slug);
  } catch (e) {
    if (e instanceof StorefrontError && e.status === 404) return null;
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) return { title: "Category not found" };
  return {
    title: cat.name,
    description:
      cat.description ?? `Shop ${cat.name} at Rakib Enterprise — atelier-cut pieces.`,
    openGraph: {
      title: cat.name,
      description:
        cat.description ?? `Shop ${cat.name} at Rakib Enterprise — atelier-cut pieces.`,
      images: cat.bannerImage || cat.image ? [{ url: cat.bannerImage || cat.image }] : [],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const query = flatten(sp);

  const category = await loadCategory(slug);
  if (!category) notFound();

  // Pull all categories so we can render breadcrumb (parent) + sibling nav +
  // the FilterRail / ActiveFilters chips below.
  const allCategories = await storefront.categories.list().catch(() => []);

  // Derive sibling categories (same gender, same depth — i.e. top-level peers
  // of this category) for the secondary nav row.
  const siblings = allCategories
    .filter(
      (c) =>
        c.id !== category.id &&
        (category.gender ? c.gender === category.gender : true),
    )
    .slice(0, 8);

  // Build the products query — locked to this category slug.
  const djangoQuery: StorefrontProductQuery = {
    search: query.q,
    category: slug,
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
    const [res, facetsRes] = await Promise.all([
      storefront.products.list(djangoQuery),
      storefront.products.facets(),
    ]);
    serverItems = res.items;
    total = res.total;
    facets = facetsRes;
  } catch (e) {
    serverError = (e as Error).message;
  }

  const filtered = query.onSale
    ? serverItems.filter((p) => p.compareAtPrice !== undefined && p.compareAtPrice > p.price)
    : serverItems;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  const heroImage = category.bannerImage || category.image || "";
  const subcats = category.subcategories ?? [];

  return (
    <Suspense fallback={null}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <CategoryHero
        category={category}
        heroImage={heroImage}
        total={total}
      />

      {/* ── Sub-categories pill nav ──────────────────────────────── */}
      {subcats.length > 0 && (
        <nav
          aria-label="Sub-categories"
          className="shell pb-2 -mt-4 md:-mt-6"
        >
          <div className="flex flex-wrap gap-2">
            {subcats.map((sub) => (
              <Link
                key={sub.id}
                href={`/categories/${sub.slug}`}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-full border border-navy/15 text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-navy hover:text-cream transition-colors"
              >
                {sub.name}
                {sub.productCount > 0 && (
                  <span className="tabular text-[10px] opacity-60">
                    {sub.productCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* ── Filters + grid ───────────────────────────────────────── */}
      <div className="shell pb-24 md:pb-32">
        {serverError && (
          <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6">
            Couldn&apos;t load products: {serverError}
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
                {total} {total === 1 ? "part" : "parts"}
              </div>
              <SortControl />
            </div>

            <div className="py-5">
              <ActiveFilters facets={facets} />
            </div>

            {filtered.length === 0 ? (
              <EmptyCategory categoryName={category.name} />
            ) : (
              <>
                <ProductGrid products={filtered} />
                <Pagination
                  page={query.page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={query.pageSize}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Sibling categories ───────────────────────────────────── */}
      {siblings.length > 0 && (
        <SiblingCategories siblings={siblings} currentGender={category.gender} />
      )}
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CategoryHero({
  category,
  heroImage,
  total,
}: {
  category: Category;
  heroImage: string;
  total: number;
}) {
  // If there's a banner image, render an immersive hero with overlay text.
  // Otherwise fall back to a minimal text-only header on cream.
  if (heroImage) {
    return (
      <header className="relative h-[55vh] min-h-[420px] w-full overflow-hidden bg-navy">
        <Image
          src={heroImage}
          alt={category.name}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-navy/10 to-navy/85" />

        <div className="relative z-10 h-full shell flex flex-col justify-end pb-12 md:pb-16">
          <Breadcrumb category={category} variant="dark" />
          <p className="mt-6 text-[11px] tracking-[0.35em] uppercase text-gold">
            {(category.gender ?? "Category")} ·{" "}
            <span className="tabular">{String(total).padStart(2, "0")}</span>{" "}
            {total === 1 ? "piece" : "pieces"}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.75rem,9vw,7rem)] leading-[0.9] tracking-tight text-cream">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-5 max-w-xl text-cream/80 leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
      <Breadcrumb category={category} variant="light" />
      <p className="mt-6 text-[11px] tracking-[0.35em] uppercase text-gold">
        {(category.gender ?? "Category")} ·{" "}
        <span className="tabular">{String(total).padStart(2, "0")}</span>{" "}
        {total === 1 ? "piece" : "pieces"}
      </p>
      <h1 className="mt-4 font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-6 max-w-xl text-ink/65 leading-relaxed">
          {category.description}
        </p>
      )}
    </header>
  );
}

function Breadcrumb({
  category,
  variant,
}: {
  category: Category;
  variant: "light" | "dark";
}) {
  const muted =
    variant === "dark" ? "text-cream/60" : "text-ink/45";
  const accent =
    variant === "dark" ? "text-cream" : "text-navy";
  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-[10px] tracking-[0.3em] uppercase flex items-center gap-2 flex-wrap ${muted}`}
    >
      <Link href="/" className="hover:underline">
        Home
      </Link>
      <ChevronRight size={12} className="opacity-50" />
      <Link href="/categories" className="hover:underline">
        Shop
      </Link>
      <ChevronRight size={12} className="opacity-50" />
      <span className={accent}>{category.name}</span>
    </nav>
  );
}

function EmptyCategory({ categoryName }: { categoryName: string }) {
  return (
    <div className="text-center py-20 px-4">
      <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
        Nothing matches
      </p>
      <h2 className="font-display text-2xl md:text-3xl text-navy">
        No {categoryName.toLowerCase()} pieces match your filters.
      </h2>
      <p className="mt-3 text-sm text-ink/55 max-w-sm mx-auto">
        Try clearing a filter or browse the full catalog.
      </p>
      <Link
        href="/products"
        className="mt-8 inline-flex items-center gap-2 link-swipe text-navy text-[11px] tracking-[0.25em] uppercase"
      >
        Browse all products
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function SiblingCategories({
  siblings,
  currentGender,
}: {
  siblings: Category[];
  currentGender?: Category["gender"];
}) {
  return (
    <section className="bg-bone py-20 md:py-28 border-t border-[var(--jmn-line)]">
      <div className="shell">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">
              Continue browsing
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-navy">
              {currentGender
                ? `Other ${currentGender} categories`
                : "Other categories"}
            </h2>
          </div>
          <Link
            href="/categories"
            className="hidden md:inline-flex items-center gap-2 link-swipe text-navy text-[11px] tracking-[0.25em] uppercase"
          >
            All categories <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {siblings.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden bg-cream"
            >
              {c.image && (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-navy/65 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-cream">
                <p className="text-[10px] tracking-[0.25em] uppercase text-gold mb-1">
                  {c.productCount > 0
                    ? `${c.productCount} ${c.productCount === 1 ? "piece" : "pieces"}`
                    : "Browse"}
                </p>
                <h3 className="font-display text-xl">{c.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
