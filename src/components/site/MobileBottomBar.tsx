"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { QuoteCount } from "@/components/ui/ListCount";
import { whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ServoMotorIcon } from "@/components/icons/parts";
import { NutIcon, QuoteIcon, ShopIcon } from "./mobile/tab-icons";
import { TAB_HREFS, TEXT_ENTRY_SELECTOR, nextBarState, tabAriaCurrent, type BarScrollState, type TabKey } from "./mobile/tabs";

const TABS: readonly { key: TabKey; Icon: typeof ShopIcon }[] = [
  { key: "home", Icon: ShopIcon },
  { key: "parts", Icon: NutIcon },
  { key: "devices", Icon: ServoMotorIcon },
  { key: "quote", Icon: QuoteIcon },
];

/**
 * Phone/tablet tab bar (below lg): Home · Parts · Devices · Quote (count)
 * · WhatsApp. Search lives in the header (full-screen sheet).
 *  - Active tab: red rule on top + ink label, aria-current.
 *  - 60px + the gesture-area inset; every cell ≥ 44px.
 *  - Slides away while scrolling down, back on scroll up / near the top or
 *    the end of the page; steps aside while a text field has focus (soft
 *    keyboard). With reduced motion it never moves on scroll.
 */
export function MobileBottomBar({ whatsapp }: { whatsapp: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const wa = whatsappHref(whatsapp, t("ui.askWhatsapp"));
  const [scrollHidden, setScrollHidden] = useState(false);
  const [typing, setTyping] = useState(false);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let state: BarScrollState = { hidden: false, anchor: window.scrollY };
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (reduce.matches) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const next = nextBarState(state, window.scrollY, max);
        if (next.hidden !== state.hidden) setScrollHidden(next.hidden);
        state = next;
      });
    };
    const isEntry = (el: EventTarget | null) =>
      el instanceof Element && el.matches(TEXT_ENTRY_SELECTOR) && !bar.current?.contains(el);
    const onFocusIn = (e: FocusEvent) => setTyping(isEntry(e.target));
    const onFocusOut = (e: FocusEvent) => {
      if (!isEntry(e.relatedTarget)) setTyping(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // A new page starts with the bar in view.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setScrollHidden(false);
  }

  const hidden = scrollHidden || typing;
  const cell =
    "relative flex min-h-[3.75rem] flex-1 flex-col items-center justify-center gap-1 px-0.5 pt-1 text-center " +
    "text-[0.6875rem] leading-tight font-semibold bn:text-[0.75rem] bn:leading-tight " +
    "outline-offset-[-3px] transition-colors duration-150 ease-re [-webkit-tap-highlight-color:transparent]";

  return (
    <nav data-mobile-tabbar=""
      ref={bar}
      aria-label={t("a11y.mobileNav")}
      data-hidden={hidden || undefined}
      // Keyboard focus landing in a hidden bar brings it back.
      onFocus={() => setScrollHidden(false)}
      className={cn(
        "re-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-re-steel-200 bg-re-paper pb-[env(safe-area-inset-bottom)] lg:hidden",
        "transition-transform duration-180 ease-re data-hidden:translate-y-full",
        typing && "invisible",
      )}
    >
      <ul className="flex">
        {TABS.map(({ key, Icon }) => {
          const current = tabAriaCurrent(key, pathname);
          return (
            <li key={key} className="flex min-w-0 flex-1">
              <Link
                href={TAB_HREFS[key]}
                aria-current={current}
                className={cn(cell, current ? "text-re-ink" : "text-re-steel-600 active:bg-re-steel-50")}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 top-0 h-[3px] bg-re-red transition-transform duration-180 ease-re origin-center",
                    current ? "scale-x-100" : "scale-x-0",
                  )}
                />
                <span className="relative">
                  <Icon className={cn("size-6", current && "[stroke-width:1.75]")} />
                  {key === "quote" && <QuoteCount className="absolute -top-1.5 left-4 ring-2 ring-re-paper" />}
                </span>
                <span className="max-w-full truncate">{t(`site.tabs.${key}`)}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-1">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener"
              className={cn(cell, "bg-re-whatsapp text-white active:bg-re-whatsapp-dark")}
            >
              <WhatsAppIcon className="size-6" />
              <span className="max-w-full truncate">{t("site.tabs.whatsapp")}</span>
            </a>
          ) : (
            <Link href="/contact" className={cn(cell, "bg-re-whatsapp text-white active:bg-re-whatsapp-dark")}>
              <WhatsAppIcon className="size-6" />
              <span className="max-w-full truncate">{t("site.tabs.whatsapp")}</span>
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
