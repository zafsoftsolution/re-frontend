import { storefront, type HomePage } from "@/lib/storefront";
import Hero from "@/components/home/Hero";

// The home page is fully driven by admin-edited blocks + live catalog data.
// Render dynamically so any change in `/admin/homepage` is visible on the
// next page load — no waiting for an ISR window to expire.
export const revalidate = 0;
export const dynamic = "force-dynamic";

import Marquee from "@/components/home/Marquee";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedEdit from "@/components/home/FeaturedEdit";
import ManifestoSplit from "@/components/home/ManifestoSplit";
import NewArrivalsRail from "@/components/home/NewArrivalsRail";
import LookbookStrip from "@/components/home/LookbookStrip";
import BestSellersGrid from "@/components/home/BestSellersGrid";
import TestimonialsCarousel from "@/components/home/TestimonialsCarousel";
import NewsletterClosing from "@/components/home/NewsletterClosing";

const EMPTY_HOME: HomePage = {
  blocks: {
    heroes: [],
    marquee: [],
    categoryGrid: null,
    featuredEdit: null,
    manifesto: null,
    newArrivals: null,
    lookbookFeature: null,
    bestSellers: null,
    testimonials: null,
    newsletterCta: null,
    custom: [],
  },
  featuredEditProducts: [],
  newArrivals: [],
  bestSellers: [],
  categories: [],
  lookbooks: [],
  testimonials: [],
};

export default async function HomePageRoute() {
  // Fall back to empty payload (components handle their own static fallbacks)
  // if the backend is unreachable so the storefront still renders during
  // local dev or transient outages.
  const home = await storefront.home.get().catch(() => EMPTY_HOME);
  const { blocks } = home;
  const hero = blocks.heroes[0];

  return (
    <>
      <Hero block={hero} />
      <Marquee blocks={blocks.marquee} />
      <CategoryGrid categories={home.categories} block={blocks.categoryGrid} />
      <FeaturedEdit
        block={blocks.featuredEdit}
        products={home.featuredEditProducts}
      />
      <ManifestoSplit block={blocks.manifesto} />
      <NewArrivalsRail products={home.newArrivals} block={blocks.newArrivals} />
      <LookbookStrip
        lookbooks={home.lookbooks}
        block={blocks.lookbookFeature}
      />
      <BestSellersGrid products={home.bestSellers} block={blocks.bestSellers} />
      <TestimonialsCarousel
        testimonials={home.testimonials}
        block={blocks.testimonials}
      />
      <NewsletterClosing block={blocks.newsletterCta} />
    </>
  );
}
