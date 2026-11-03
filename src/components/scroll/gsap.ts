/**
 * The only module that imports GSAP. It is reached exclusively through the
 * lazy motion islands in ./ScrollStage.tsx, so GSAP ships in its own async
 * chunk on Home and About and never in shared or catalogue JS.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Desktop gets the pinned / scrubbed version, phones short reveals only.
 *  With `prefers-reduced-motion: reduce` neither matches: static layout. */
export const MOTION_QUERIES = {
  desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
} as const;

/** Re-measure once webfonts (and late images) have settled. */
export function refreshWhenSettled(): () => void {
  let cancelled = false;
  const refresh = () => {
    if (!cancelled) ScrollTrigger.refresh();
  };
  document.fonts?.ready.then(refresh).catch(() => {});
  window.addEventListener("load", refresh, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", refresh);
  };
}

export { gsap, ScrollTrigger, useGSAP };
