"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import type { Product, Review } from "@/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import ProductCard from "@/components/catalog/ProductCard";

const FREE_SHIP =
  `${siteConfig.currency.symbol}${siteConfig.freeShippingThreshold}`;

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  product: Product;
  initialReviews: Review[];
  related: Product[];
  categoryName: string;
  brandName?: string;
}

export default function ProductView({
  product,
  initialReviews,
  related,
  categoryName,
  brandName,
}: Props) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const onSale = !!(product.compareAtPrice && product.compareAtPrice > product.price);
  const saved = isInWishlist(product.id);

  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const stock = product.stock ?? 0;
  const oos = stock <= 0;
  const lowStock = !oos && stock <= 10;
  const canAdd = !oos;

  function handleAdd() {
    if (!canAdd) return;
    setAdding(true);
    // Spare parts have no size/color variants.
    addToCart({ product, size: "" as never, color: "", quantity: qty });
    setTimeout(() => {
      setAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }, 250);
  }

  return (
    <>
      <Breadcrumb categoryName={categoryName} categorySlug={product.category} name={product.name} />

      <section className="shell pb-20 md:pb-32">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20">
          <Gallery
            product={product}
            activeIndex={activeImage}
            onSelect={setActiveImage}
            saleBadge={onSale}
            newBadge={!!product.isNew}
            oosBadge={oos}
          />

          <div className="lg:sticky lg:top-28 self-start">
            <Info
              product={product}
              brandName={brandName}
              categoryName={categoryName}
              onSale={onSale}
              onJumpReviews={() => {
                document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
              }}
            />

            <PartMeta product={product} />

            <div className="mt-7 flex items-center gap-4">
              <span className="text-[10px] tracking-[0.3em] uppercase text-ink/50">
                Quantity
              </span>
              <QtyControl value={qty} onChange={setQty} max={Math.max(1, Math.min(99, stock))} />
              {lowStock && (
                <span className="text-xs text-rose-700">Only {stock} left</span>
              )}
              {!oos && !lowStock && (
                <span className="text-xs text-emerald-700">In stock</span>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAdd}
                disabled={!canAdd || adding}
                className={cn(
                  "btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed",
                  added && "!bg-emerald-700"
                )}
              >
                {adding ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShoppingBag size={14} />
                )}
                <span>
                  {oos ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
                </span>
              </button>
              <button
                onClick={() => toggleWishlist(product)}
                aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                className={cn(
                  "btn-ghost text-navy border-navy/30 hover:border-navy",
                  saved && "border-navy bg-navy text-cream"
                )}
              >
                <Heart
                  size={14}
                  className={saved ? "fill-current" : ""}
                  strokeWidth={2}
                />
                <span>{saved ? "Saved" : "Save"}</span>
              </button>
            </div>

            <ShippingNote />

            <div className="mt-10 space-y-1">
              <Disclosure title="Description" defaultOpen>
                <p className="text-sm leading-relaxed text-ink/75">
                  {product.description}
                </p>
              </Disclosure>

              <Disclosure title="Compatibility" defaultOpen>
                <Compatibility product={product} />
              </Disclosure>

              {product.specifications &&
                Object.keys(product.specifications).length > 0 && (
                  <Disclosure title="Specifications">
                    <dl className="text-sm text-ink/75 space-y-2">
                      {Object.entries(product.specifications).map(([k, v]) => (
                        <Detail key={k} label={k} value={v} />
                      ))}
                    </dl>
                  </Disclosure>
                )}

              <Disclosure title="Shipping & returns">
                <ul className="space-y-3 text-sm text-ink/75">
                  <li>Same-day dispatch on in-stock parts (order before 4pm).</li>
                  <li>Nationwide delivery across Bangladesh; cash on delivery available.</li>
                  <li>7-day returns on unused parts in original packaging.</li>
                  <li>Genuine manufacturing defects replaced free.</li>
                </ul>
              </Disclosure>
            </div>
          </div>
        </div>
      </section>

      <ReviewsSection product={product} initialReviews={initialReviews} />

      {related.length > 0 && <RelatedSection products={related} />}
    </>
  );
}

// ─── Breadcrumb ──────────────────────────────────────────────────────────────

function Breadcrumb({
  categoryName,
  categorySlug,
  name,
}: {
  categoryName: string;
  categorySlug: string;
  name: string;
}) {
  return (
    <nav className="shell pt-32 md:pt-40 pb-6 text-[11px] tracking-[0.2em] uppercase text-ink/50">
      <ol className="flex items-center gap-2 overflow-x-auto rail">
        <li>
          <Link href="/" className="hover:text-navy transition-colors">
            Home
          </Link>
        </li>
        <li className="text-ink/30">/</li>
        <li>
          <Link href="/products" className="hover:text-navy transition-colors">
            Shop
          </Link>
        </li>
        <li className="text-ink/30">/</li>
        <li>
          <Link
            href={`/products?category=${categorySlug}`}
            className="hover:text-navy transition-colors"
          >
            {categoryName}
          </Link>
        </li>
        <li className="text-ink/30">/</li>
        <li className="text-navy truncate">{name}</li>
      </ol>
    </nav>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery({
  product,
  activeIndex,
  onSelect,
  saleBadge,
  newBadge,
  oosBadge,
}: {
  product: Product;
  activeIndex: number;
  onSelect: (i: number) => void;
  saleBadge: boolean;
  newBadge: boolean;
  oosBadge: boolean;
}) {
  const images = product.images;
  const total = images.length;

  function next() {
    onSelect((activeIndex + 1) % total);
  }
  function prev() {
    onSelect((activeIndex - 1 + total) % total);
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 md:gap-5">
      <div className="hidden md:flex flex-col gap-3 max-h-[80vh] overflow-y-auto rail">
        {images.map((img, i) => (
          <button
            key={img + i}
            onClick={() => onSelect(i)}
            aria-label={`View image ${i + 1}`}
            className={cn(
              "relative aspect-portrait w-20 shrink-0 overflow-hidden bg-bone transition-all",
              activeIndex === i
                ? "ring-1 ring-navy ring-offset-2 ring-offset-cream"
                : "opacity-60 hover:opacity-100"
            )}
          >
            <Image
              src={img}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="relative aspect-portrait overflow-hidden bg-bone">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute inset-0"
            >
              <Image
                src={images[activeIndex]}
                alt={product.name}
                fill
                priority={activeIndex === 0}
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            {newBadge && (
              <span className="bg-gold text-navy text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
                New
              </span>
            )}
            {saleBadge && (
              <span className="bg-navy text-cream text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
                Sale
              </span>
            )}
            {oosBadge && (
              <span className="bg-ink/90 text-cream text-[10px] tracking-[0.25em] uppercase px-2 py-1 font-semibold">
                Sold out
              </span>
            )}
          </div>

          {total > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-cream/85 backdrop-blur hover:bg-navy hover:text-cream transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-cream/85 backdrop-blur hover:bg-navy hover:text-cream transition-colors"
              >
                <ChevronRight size={18} />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-cream/85 backdrop-blur px-3 py-1.5 rounded-full md:hidden">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onSelect(i)}
                    aria-label={`Go to image ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === activeIndex ? "w-6 bg-navy" : "w-1.5 bg-navy/30"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <p className="mt-3 text-[10px] tracking-[0.3em] uppercase text-ink/45 tabular text-right">
          {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}

// ─── Info column ─────────────────────────────────────────────────────────────

function Info({
  product,
  brandName,
  categoryName,
  onSale,
  onJumpReviews,
}: {
  product: Product;
  brandName?: string;
  categoryName: string;
  onSale: boolean;
  onJumpReviews: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] uppercase text-gold">
        {brandName ?? categoryName}
        {brandName ? ` · ${categoryName}` : ""}
      </p>
      <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-tight text-navy">
        {product.name}
      </h1>

      {product.shortDescription && (
        <p className="mt-4 text-ink/65 text-[15px] leading-relaxed">
          {product.shortDescription}
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <RatingPill rating={product.rating} count={product.reviewCount} onClick={onJumpReviews} />
        {product.collection && (
          <span className="text-[10px] tracking-[0.3em] uppercase text-ink/55">
            {product.collection}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="font-display text-3xl text-navy tabular">
          {formatPrice(product.price, product.currency)}
        </span>
        {onSale && (
          <>
            <span className="text-base text-ink/45 line-through tabular">
              {formatPrice(product.compareAtPrice!, product.currency)}
            </span>
            <span className="text-[11px] tracking-[0.2em] uppercase text-rose-700">
              Save{" "}
              {Math.round(
                ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100
              )}
              %
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function RatingPill({
  rating,
  count,
  onClick,
}: {
  rating: number;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-ink/70 hover:text-navy transition-colors"
    >
      <span className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={14}
            className={cn(
              "transition-colors",
              i < Math.round(rating) ? "fill-gold text-gold" : "text-ink/20"
            )}
          />
        ))}
      </span>
      <span className="tabular">
        {rating.toFixed(1)}
        <span className="text-ink/50"> · {count} review{count === 1 ? "" : "s"}</span>
      </span>
    </button>
  );
}

// ─── Part meta + compatibility ───────────────────────────────────────────────

function PartMeta({ product }: { product: Product }) {
  const rows: Array<[string, string | undefined]> = [
    ["Part number", product.partNumber],
    ["Parts brand", product.brandName],
    ["Category", product.categoryName],
    ["SKU", product.sku],
  ];
  return (
    <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-[var(--jmn-line)] py-5">
      {rows
        .filter(([, v]) => !!v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] tracking-[0.25em] uppercase text-ink/45">{k}</dt>
            <dd className="mt-0.5 text-sm text-navy">
              {k === "Parts brand" && product.isOem ? `${v} · OEM` : v}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function Compatibility({ product }: { product: Product }) {
  const brands = product.machineBrandsDetail ?? [];
  const models = product.machineModelsDetail ?? [];
  const brandSlugs = product.machineBrands;

  if (brands.length === 0 && models.length === 0 && brandSlugs.length === 0) {
    return (
      <p className="text-sm text-ink/70">
        Universal fit — compatible across machine brands. Contact us to confirm your model.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-ink/45 mb-2">
          Machine brands
        </p>
        <div className="flex flex-wrap gap-2">
          {(brands.length ? brands.map((b) => b.name) : brandSlugs).map((name) => (
            <Link
              key={name}
              href={`/products?machineBrand=${encodeURIComponent(
                brands.find((b) => b.name === name)?.slug ?? name,
              )}`}
              className="text-[12px] tracking-[0.05em] uppercase border border-navy/20 rounded-full px-3 py-1 text-navy hover:border-navy hover:bg-navy hover:text-cream transition-colors"
            >
              {name}
            </Link>
          ))}
        </div>
      </div>

      {models.length > 0 && (
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-ink/45 mb-2">
            Fits models
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {models.map((m) => (
              <li key={m.slug} className="flex items-center gap-2 text-sm text-ink/75">
                <span className="h-1 w-3 bg-gold shrink-0" />
                <span className="text-navy">
                  {m.brandName ? `${m.brandName} ` : ""}
                  {m.name}
                </span>
                {m.machineTypeDisplay && (
                  <span className="text-[10px] tracking-[0.12em] uppercase text-ink/45">
                    {m.machineTypeDisplay}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QtyControl({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center border border-navy/20">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="h-10 w-10 grid place-items-center text-navy hover:bg-navy hover:text-cream disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center text-navy tabular">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="h-10 w-10 grid place-items-center text-navy hover:bg-navy hover:text-cream disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function ShippingNote() {
  return (
    <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-bone/60 border border-[var(--jmn-line)]">
      <Truck size={16} className="text-gold shrink-0" />
      <p className="text-xs text-ink/75 leading-snug">
        Complimentary shipping over <span className="text-navy">{FREE_SHIP}</span> · Free returns
        within 30 days.
      </p>
    </div>
  );
}

// ─── Disclosures ─────────────────────────────────────────────────────────────

function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--jmn-line)] last:border-b">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-[12px] tracking-[0.25em] uppercase text-navy">{title}</span>
        <ChevronDown
          size={16}
          className={cn("text-navy/60 transition-transform", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="text-[10px] tracking-[0.25em] uppercase text-ink/50">
        {label}
      </dt>
      <dd className={cn("text-navy text-right", capitalize && "capitalize")}>{value}</dd>
    </div>
  );
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

function ReviewsSection({
  product,
  initialReviews,
}: {
  product: Product;
  initialReviews: Review[];
}) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);

  const summary = useMemo(() => {
    if (reviews.length === 0)
      return { avg: product.rating, total: product.reviewCount, dist: [0, 0, 0, 0, 0] };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of reviews) {
      sum += r.rating;
      dist[Math.min(4, Math.max(0, r.rating - 1))]++;
    }
    return { avg: sum / reviews.length, total: reviews.length, dist };
  }, [reviews, product.rating, product.reviewCount]);

  function handleAdded(review: Review) {
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
  }

  return (
    <section id="reviews" className="bg-bone/50 py-20 md:py-28 scroll-mt-28">
      <div className="shell">
        <div className="grid lg:grid-cols-[360px_1fr] gap-12 lg:gap-20">
          <div className="lg:sticky lg:top-28 self-start">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
              /Reviews
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-navy tracking-tight">
              What guests <span className="italic">say.</span>
            </h2>

            <div className="mt-8 flex items-center gap-4">
              <span className="font-display text-5xl text-navy tabular">
                {summary.avg.toFixed(1)}
              </span>
              <div>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < Math.round(summary.avg) ? "fill-gold text-gold" : "text-ink/20"
                      }
                    />
                  ))}
                </div>
                <p className="text-xs text-ink/55 mt-1 tabular">
                  {reviews.length || product.reviewCount} review
                  {(reviews.length || product.reviewCount) === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="mt-6 space-y-1.5">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = summary.dist[rating - 1];
                  const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3 text-xs text-ink/65">
                      <span className="w-3 tabular">{rating}</span>
                      <Star size={11} className="fill-gold text-gold" />
                      <div className="flex-1 h-1 bg-navy/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right tabular">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8">
              {isAuthenticated ? (
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="btn-primary"
                >
                  <Plus size={14} />
                  {showForm ? "Cancel" : "Write a review"}
                </button>
              ) : (
                <Link
                  href="/account"
                  className="btn-ghost text-navy border-navy/30 hover:border-navy"
                >
                  <span>Sign in to review</span>
                </Link>
              )}
            </div>
          </div>

          <div>
            <AnimatePresence initial={false}>
              {showForm && (
                <motion.div
                  key="form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="overflow-hidden mb-10"
                >
                  <ReviewForm productId={product.id} onAdded={handleAdded} />
                </motion.div>
              )}
            </AnimatePresence>

            {reviews.length === 0 ? (
              <div className="border border-dashed border-[var(--jmn-line)] px-8 py-16 text-center">
                <p className="font-display text-2xl text-navy">
                  Be the <span className="italic">first</span> to share.
                </p>
                <p className="mt-3 text-sm text-ink/60 max-w-sm mx-auto">
                  Tell us how it fits and how it wears — your notes guide the next guest.
                </p>
              </div>
            ) : (
              <ul className="space-y-8">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <li className="border-b border-[var(--jmn-line)] pb-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-navy text-cream grid place-items-center font-display text-base">
            {review.userName.charAt(0)}
          </div>
          <div>
            <p className="text-sm text-navy">{review.userName}</p>
            <p className="text-[10px] tracking-[0.25em] uppercase text-ink/45">
              {formatDate(review.date)} {review.verified && "· Verified guest"}
            </p>
          </div>
        </div>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              size={13}
              className={i < review.rating ? "fill-gold text-gold" : "text-ink/20"}
            />
          ))}
        </div>
      </div>
      <h4 className="font-display text-lg text-navy">{review.title}</h4>
      <p className="mt-2 text-sm text-ink/75 leading-relaxed">{review.comment}</p>
      {review.fit && (
        <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-ink/50">
          Fit: <span className="text-navy">{review.fit}</span>
        </p>
      )}
    </li>
  );
}

function ReviewForm({
  productId,
  onAdded,
}: {
  productId: string;
  onAdded: (r: Review) => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [fit, setFit] = useState<"small" | "true" | "large" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const review = await api.post<Review>("/reviews", {
        productId,
        rating,
        title,
        comment,
        fit: fit || undefined,
      });
      onAdded(review);
    } catch (err) {
      setError((err as Error).message ?? "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  }

  const display = hover ?? rating;

  return (
    <form
      onSubmit={submit}
      className="bg-cream border border-[var(--jmn-line)] p-6 md:p-8"
    >
      <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
        Your review
      </p>

      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setRating(i)}
            aria-label={`${i} star${i === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <Star
              size={26}
              className={cn(
                "transition-colors",
                i <= display ? "fill-gold text-gold" : "text-ink/20"
              )}
            />
          </button>
        ))}
      </div>

      <label className="block mb-4">
        <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-1.5">
          Title
        </span>
        <input
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quietly perfect"
          className="w-full bg-transparent border-b border-navy/20 focus:border-navy outline-none py-2.5 text-navy placeholder:text-ink/35 transition-colors"
        />
      </label>

      <label className="block mb-4">
        <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-1.5">
          Your notes
        </span>
        <textarea
          required
          minLength={10}
          maxLength={1500}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How does it fit? How does it wear?"
          className="w-full bg-transparent border border-navy/15 focus:border-navy outline-none p-3 text-sm text-navy placeholder:text-ink/35 transition-colors resize-none"
        />
      </label>

      <div className="mb-6">
        <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-2">
          Fit
        </span>
        <div className="flex gap-2">
          {(["small", "true", "large"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFit(fit === f ? "" : f)}
              className={cn(
                "px-4 py-2 text-[11px] tracking-[0.2em] uppercase border transition-colors",
                fit === f
                  ? "bg-navy text-cream border-navy"
                  : "border-navy/20 text-navy hover:border-navy"
              )}
            >
              Runs {f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rose-700 mb-4">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        Submit review
      </button>
    </form>
  );
}

// ─── Related products ────────────────────────────────────────────────────────

function RelatedSection({ products }: { products: Product[] }) {
  return (
    <section className="shell py-20 md:py-32">
      <div className="flex items-end justify-between mb-10 md:mb-14">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
            /You may also love
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-navy tracking-tight">
            From the same <span className="italic">edit.</span>
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden md:inline-flex items-center gap-2 link-swipe text-navy text-[11px] tracking-[0.3em] uppercase"
        >
          All pieces
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-6 md:gap-y-16">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
