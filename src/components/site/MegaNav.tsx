"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, ChevronDown, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PART_ICONS } from "@/components/icons/parts";
import { cn } from "@/lib/utils";
import { activeNavKey, DEVICES_HREF, PRIMARY_NAV, type NavCategory, type NavData, type NavMachineBrand, type PanelKey } from "./nav";

/** Hover intent: open after a short rest, close after the pointer has really left. */
const OPEN_DELAY = 140;
const CLOSE_DELAY = 240;
/** A click right after a hover-open keeps the panel open instead of toggling it shut. */
const HOVER_CLICK_GRACE = 450;

const noopSubscribe = () => () => {};

/**
 * Desktop primary navigation with mega-menu panels (Parts, Devices, Parts by
 * machine). Disclosure pattern, not an ARIA menu: each panel trigger is a
 * <button aria-expanded aria-controls>, panels sit in DOM order right after
 * their trigger so Tab walks into them.
 *
 *  - opens on click, Enter/Space, ArrowDown (focuses the first link) and on
 *    hover-intent; Esc closes and returns focus to the trigger; closes on
 *    outside click, when focus moves to another item, and on navigation.
 *  - Progressive enhancement: the server (and no-JS) render is plain links
 *    (/categories, /categories#devices, /machines); after hydration the
 *    panel items become buttons. Panels are absolutely positioned under the
 *    row — opening never moves the page.
 *  - Sticky: the row sticks to the top; once stuck a small logo mark fades
 *    in and the items slide over by transform only (no layout shift).
 */
export function MegaNav({ data }: { data: NavData }) {
  const t = useTranslations("nav");
  const tA = useTranslations("a11y");
  const pathname = usePathname();
  const enhanced = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // The open panel remembers the path it was opened on, so navigating closes it.
  const [openState, setOpenState] = useState<{ key: PanelKey; path: string } | null>(null);
  const open = openState && openState.path === pathname ? openState.key : null;
  const [stuck, setStuck] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const hoverOpenedAt = useRef(0);
  const triggers = useRef<Partial<Record<PanelKey, HTMLButtonElement | null>>>({});
  const panels = useRef<Partial<Record<PanelKey, HTMLDivElement | null>>>({});
  const focusFirstOnOpen = useRef(false);
  const uid = useId();

  const deviceSlugs = new Set(data.devices.map((d) => d.slug));
  const active = activeNavKey(pathname, deviceSlugs);
  const hasPanel: Record<PanelKey, boolean> = {
    parts: data.parts.length > 0,
    devices: data.devices.length > 0,
    machines: data.machineBrands.length > 0,
  };

  const clearTimer = () => window.clearTimeout(timer.current);
  const show = (key: PanelKey) => {
    clearTimer();
    setOpenState({ key, path: pathname });
  };
  const close = (focusTrigger = false) => {
    clearTimer();
    if (focusTrigger && open) triggers.current[open]?.focus();
    setOpenState(null);
  };

  // Outside click closes.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenState(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // ArrowDown on a trigger: focus the first link once the panel is visible.
  useEffect(() => {
    if (open && focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      panels.current[open]?.querySelector<HTMLElement>("a[href]")?.focus();
    }
  }, [open]);

  // Stuck state for the compact logo mark.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const visibleItems = PRIMARY_NAV.filter((item) => item.key !== "devices" || hasPanel.devices);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="hidden h-px lg:block" />
      <nav
        ref={navRef}
        aria-label={tA("mainNav")}
        data-stuck={stuck || undefined}
        className="group/nav sticky top-0 z-40 hidden border-b border-re-steel-200 bg-re-paper lg:block"
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.stopPropagation();
            close(true);
          }
        }}
      >
        <div className="re-shell relative flex h-12 items-stretch">
          {/* Compact mark, shown once the row is stuck to the top. */}
          <div className="relative w-0">
            <Link
              href="/"
              aria-label={tA("home")}
              tabIndex={stuck ? undefined : -1}
              aria-hidden={stuck ? undefined : true}
              className={cn(
                "absolute top-1/2 left-0 flex h-9 -translate-y-1/2 items-center pr-3 transition-opacity duration-150 ease-re",
                stuck ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <Image src="/logo/rakib-enterprise.png" alt="" width={434} height={240} sizes="48px" className="h-7 w-auto" />
            </Link>
          </div>

          <ul
            className={cn(
              "-ml-3 flex items-stretch transition-transform duration-180 ease-re",
              stuck && "translate-x-14",
            )}
          >
            {visibleItems.map((item) => {
              const label = t(item.key);
              const isActive = active === item.key;
              const panel = item.panel && hasPanel[item.panel] ? item.panel : null;
              const isOpen = panel !== null && open === panel;
              const panelId = `${uid}-${panel}`;
              const itemClass = cn(
                "relative inline-flex h-12 items-center gap-1 px-3 text-[0.9375rem] font-semibold whitespace-nowrap text-re-ink transition-colors duration-150",
                // Bottom marker: ink on hover/open, red (persistent) for the current section.
                "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-re-ink after:transition-transform after:duration-150 hover:after:scale-x-100",
                isOpen && "bg-re-steel-50 after:scale-x-100",
                isActive && "after:scale-x-100 after:bg-re-red",
              );

              if (!panel) {
                return (
                  <li
                    key={item.key}
                    className="flex"
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse" && open) {
                        clearTimer();
                        timer.current = window.setTimeout(() => setOpenState(null), CLOSE_DELAY);
                      }
                    }}
                    onFocus={() => open && setOpenState(null)}
                  >
                    <Link href={item.href} aria-current={isActive ? "page" : undefined} className={itemClass}>
                      {label}
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={item.key}
                  className="flex"
                  onPointerEnter={(e) => {
                    if (!enhanced || e.pointerType !== "mouse") return;
                    clearTimer();
                    if (open && open !== panel) show(panel);
                    else if (!open)
                      timer.current = window.setTimeout(() => {
                        hoverOpenedAt.current = Date.now();
                        show(panel);
                      }, OPEN_DELAY);
                  }}
                  onPointerLeave={(e) => {
                    if (!enhanced || e.pointerType !== "mouse") return;
                    clearTimer();
                    timer.current = window.setTimeout(() => setOpenState(null), CLOSE_DELAY);
                  }}
                  onFocus={(e) => {
                    // Focus arriving from another item closes whatever else is open.
                    if (open && open !== panel && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenState(null);
                  }}
                  onBlur={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (isOpen && next && !e.currentTarget.contains(next)) setOpenState(null);
                  }}
                >
                  {enhanced ? (
                    <button
                      ref={(el) => {
                        triggers.current[panel] = el;
                      }}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-current={isActive ? "true" : undefined}
                      className={itemClass}
                      onClick={() => {
                        if (isOpen && Date.now() - hoverOpenedAt.current > HOVER_CLICK_GRACE) close();
                        else if (!isOpen) {
                          hoverOpenedAt.current = 0;
                          show(panel);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          focusFirstOnOpen.current = true;
                          if (isOpen) panels.current[panel]?.querySelector<HTMLElement>("a[href]")?.focus();
                          else show(panel);
                        }
                      }}
                    >
                      {label}
                      <ChevronDown
                        aria-hidden
                        strokeWidth={2}
                        className={cn("size-3.5 text-re-steel-600 transition-transform duration-150 ease-re", isOpen && "rotate-180")}
                      />
                    </button>
                  ) : (
                    <Link href={item.href} aria-current={isActive ? "true" : undefined} className={itemClass}>
                      {label}
                      <ChevronDown aria-hidden strokeWidth={2} className="size-3.5 text-re-steel-600" />
                    </Link>
                  )}

                  <div
                    id={panelId}
                    ref={(el) => {
                      panels.current[panel] = el;
                    }}
                    hidden={!isOpen}
                    className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-3.25rem)] animate-re-fade-in overflow-y-auto border-t border-re-steel-200 bg-re-paper shadow-re-float"
                  >
                    {panel === "parts" && (
                      <CategoryPanel
                        index="01"
                        kicker={t("parts")}
                        title={t("partsTitle")}
                        body={t("partsBody")}
                        items={data.parts}
                        allHref="/categories"
                        allLabel={t("allParts")}
                        onNavigate={() => close()}
                      />
                    )}
                    {panel === "devices" && (
                      <CategoryPanel
                        index="02"
                        kicker={t("devices")}
                        title={t("devicesTitle")}
                        body={t("devicesBody")}
                        items={data.devices}
                        allHref={DEVICES_HREF}
                        allLabel={t("allDevices")}
                        onNavigate={() => close()}
                      />
                    )}
                    {panel === "machines" && <MachinesPanel brands={data.machineBrands} onNavigate={() => close()} />}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center pl-4">
            <Link
              href="/rfq"
              aria-current={active === "rfq" ? "page" : undefined}
              className="inline-flex h-9 items-center gap-2 rounded-re bg-re-red px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors duration-150 hover:bg-re-red-dark aria-[current=page]:bg-re-ink"
            >
              <ClipboardList aria-hidden className="size-4" strokeWidth={2} />
              {t("rfqLong")}
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

/** Left column of a panel: sheet index, title, one-line scope, totals, "All …" link. */
function PanelIntro({
  index,
  kicker,
  title,
  body,
  stats,
  allHref,
  allLabel,
  onNavigate,
}: {
  index: string;
  kicker: string;
  title: string;
  body: string;
  stats: { label: string; value: ReactNode }[];
  allHref: string;
  allLabel: string;
  onNavigate: () => void;
}) {
  return (
    <div className="relative flex flex-col border-t border-re-steel-200 pt-4">
      <span aria-hidden className="absolute -top-px left-0 h-[3px] w-10 bg-re-red" />
      <p className="re-label">
        <span className="re-mono">§ {index}</span> · {kicker}
      </p>
      <p className="mt-2 text-[1.5rem] leading-tight font-bold text-re-ink [font-stretch:80%] bn:font-re-bn-display bn:text-[1.375rem] bn:font-semibold bn:[font-stretch:100%]">
        {title}
      </p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-re-steel-600">{body}</p>
      {stats.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 border-y border-re-steel-200 text-[0.8125rem]">
          {stats.map((s, i) => (
            <div key={i} className={cn("py-2", i > 0 && "border-l border-re-steel-200 pl-3")}>
              <dt className="re-label !text-[0.625rem] bn:!text-[0.75rem]">{s.label}</dt>
              <dd className="re-mono mt-0.5 text-base font-semibold text-re-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <Link
        href={allHref}
        onClick={onNavigate}
        className="group mt-5 inline-flex min-h-11 items-center gap-2 self-start font-semibold text-re-ink hover:text-re-red-text"
      >
        {allLabel}
        <ArrowRight aria-hidden className="size-4 transition-transform duration-150 ease-re group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function CategoryPanel({
  index,
  kicker,
  title,
  body,
  items,
  allHref,
  allLabel,
  onNavigate,
}: {
  index: string;
  kicker: string;
  title: string;
  body: string;
  items: NavCategory[];
  allHref: string;
  allLabel: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("nav");
  const total = items.reduce((n, c) => n + c.count, 0);
  const cols = items.length > 8 ? 3 : 2;
  const fillers = (cols - (items.length % cols)) % cols;
  return (
    <div className="re-shell grid grid-cols-[16rem_minmax(0,1fr)] gap-10 py-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <PanelIntro
        index={index}
        kicker={kicker}
        title={title}
        body={body}
        stats={[
          { label: t("statTypes"), value: items.length },
          ...(total > 0 ? [{ label: t("statParts"), value: total }] : []),
        ]}
        allHref={allHref}
        allLabel={allLabel}
        onNavigate={onNavigate}
      />
      <ul className={cn("grid content-start gap-px self-start border border-re-steel-200 bg-re-steel-200", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {items.map((c, i) => {
          const Icon = PART_ICONS[c.icon];
          return (
            <li key={c.slug} className="bg-re-paper">
              <Link
                href={`/categories/${c.slug}`}
                onClick={onNavigate}
                className="group grid min-h-14 grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-re-steel-50"
              >
                <span aria-hidden className="re-mono text-[0.6875rem] text-re-steel-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="grid size-10 place-items-center border border-re-steel-200 bg-re-paper text-re-ink transition-colors duration-150 group-hover:border-re-ink">
                  <Icon className="size-6" />
                </span>
                <span className="leading-snug font-semibold text-re-ink group-hover:text-re-red-text">{c.name}</span>
                {c.count > 0 ? (
                  <span className="re-mono text-[0.75rem] text-re-steel-600">
                    <span aria-hidden>{c.count}</span>
                    <span className="sr-only">{t("partsCount", { count: c.count })}</span>
                  </span>
                ) : (
                  <span />
                )}
              </Link>
            </li>
          );
        })}
        {Array.from({ length: fillers }, (_, i) => (
          <li key={`f${i}`} aria-hidden className="bg-re-paper" />
        ))}
      </ul>
    </div>
  );
}

function MachinesPanel({ brands, onNavigate }: { brands: NavMachineBrand[]; onNavigate: () => void }) {
  const t = useTranslations("nav");
  const models = brands.reduce((n, b) => n + b.models, 0);
  const fillers = (4 - (brands.length % 4)) % 4;
  return (
    <div className="re-shell grid grid-cols-[16rem_minmax(0,1fr)] gap-10 py-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <PanelIntro
        index="03"
        kicker={t("byMachine")}
        title={t("machinesTitle")}
        body={t("machinesBody")}
        stats={[
          { label: t("statBrands"), value: brands.length },
          ...(models > 0 ? [{ label: t("statModels"), value: models }] : []),
        ]}
        allHref="/machines"
        allLabel={t("allMachineBrands")}
        onNavigate={onNavigate}
      />
      <div className="self-start">
        <ul className="grid grid-cols-4 gap-px border border-re-steel-200 bg-re-steel-200">
          {brands.map((b) => (
            <li key={b.slug} className="bg-re-paper">
              <Link
                href={`/machines/${b.slug}`}
                onClick={onNavigate}
                className="group flex min-h-16 flex-col justify-center px-4 py-2.5 transition-colors duration-150 hover:bg-re-steel-50"
              >
                <span className="font-bold leading-tight text-re-ink [font-stretch:85%] group-hover:text-re-red-text" translate="no">
                  {b.name}
                </span>
                <span className="re-mono mt-0.5 text-[0.75rem] text-re-steel-600">
                  {t("models", { count: b.models })}
                  {b.country && <span className="text-re-steel-400"> · {b.country}</span>}
                </span>
              </Link>
            </li>
          ))}
          {Array.from({ length: fillers }, (_, i) => (
            <li key={`f${i}`} aria-hidden className="bg-re-paper" />
          ))}
        </ul>
      </div>
    </div>
  );
}
