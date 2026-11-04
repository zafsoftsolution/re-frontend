/**
 * Mobile tab bar logic — pure so it is unit-tested (tests/unit/mobile-shell.test.ts).
 */

export type TabKey = "home" | "parts" | "devices" | "quote";

export const TAB_HREFS: Readonly<Record<TabKey, string>> = {
  home: "/",
  parts: "/categories",
  devices: "/categories#devices",
  quote: "/rfq",
};

/**
 * Which tab a (locale-less) pathname belongs to. Part pages, categories,
 * parts brands, search results and the find-by-model-number lookup
 * (/machines/*) all live under "Parts"; "Devices" is a shortcut into the
 * devices section of /categories (hash anchors aren't visible server-side, so
 * it is never the active tab); the quote list, cart and checkout under
 * "Quote". Content pages (about, contact, guides…) have no tab.
 * The business sells parts and devices only — never machines — so there is
 * deliberately no machine tab.
 */
export function activeTab(pathname: string): TabKey | null {
  const seg = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  if (seg.length === 0) return "home";
  switch (seg[0]) {
    case "categories":
    case "parts":
    case "brands":
    case "search":
    case "machines":
      return "parts";
    case "rfq":
    case "cart":
    case "checkout":
      return "quote";
    default:
      return null;
  }
}

/**
 * aria-current for a tab: "page" when the tab's own page is shown, "true"
 * when a page inside its section is (e.g. a part under Parts), else none.
 */
export function tabAriaCurrent(tab: TabKey, pathname: string): "page" | "true" | undefined {
  if (activeTab(pathname) !== tab) return undefined;
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return clean === TAB_HREFS[tab] ? "page" : "true";
}

/* -------------------------------------------------------------------------
   Hide on scroll down / show on scroll up
   ------------------------------------------------------------------------- */

export interface BarScrollState {
  hidden: boolean;
  /** Scroll position where the current direction began. */
  anchor: number;
}

/** Travel (px) in one direction before the bar flips. Ignores jitter. */
export const BAR_SCROLL_DELTA = 24;
/** Always shown this close to the top… */
export const BAR_TOP_ZONE = 96;
/** …and this close to the bottom (the footer's last row is visible above it). */
export const BAR_BOTTOM_ZONE = 48;

export function nextBarState(prev: BarScrollState, y: number, maxY: number): BarScrollState {
  if (y <= BAR_TOP_ZONE || maxY - y <= BAR_BOTTOM_ZONE) return { hidden: false, anchor: y };
  if (prev.hidden) {
    if (y >= prev.anchor) return { hidden: true, anchor: y };
    return prev.anchor - y >= BAR_SCROLL_DELTA ? { hidden: false, anchor: y } : prev;
  }
  if (y <= prev.anchor) return { hidden: false, anchor: y };
  return y - prev.anchor >= BAR_SCROLL_DELTA ? { hidden: true, anchor: y } : prev;
}

/** Text-entry controls: while one has focus (soft keyboard up) the bar steps aside. */
export const TEXT_ENTRY_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="range"]):not([type="color"]), textarea, select, [contenteditable=""], [contenteditable="true"]';
