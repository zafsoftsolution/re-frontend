import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import type { SiteSettings } from "@/lib/api/types";

/**
 * Google Tag Manager (preferred) or GA4, only when the admin set an id in
 * Settings → Analytics; renders nothing otherwise (no cookies, no banner
 * needed). Public site only — the admin has its own root layout. Both
 * components load their script with next/script `afterInteractive`, after
 * hydration, so they never block the first paint. Ids are shape-checked in
 * mapSettings before they reach a script URL.
 */
export function Analytics({ analytics }: { analytics: SiteSettings["analytics"] }) {
  if (analytics.gtm) return <GoogleTagManager gtmId={analytics.gtm} />;
  if (analytics.ga4) return <GoogleAnalytics gaId={analytics.ga4} />;
  return null;
}
