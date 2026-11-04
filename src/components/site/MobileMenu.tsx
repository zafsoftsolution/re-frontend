"use client";

import { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, ChevronDown, ClipboardList, Menu as MenuIcon, Phone, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { PART_ICONS } from "@/components/icons/parts";
import { buttonClass } from "@/components/ui/button-styles";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocaleSwitch } from "./LocaleSwitch";
import { DEVICES_HREF, type NavCategory, type NavData } from "./nav";

// The Base UI dialog behind the sheet (~20 KB gzip) is only fetched when the
// menu is about to be used — it would otherwise ship on every page.
const loadSheet = () => import("@/components/ui/Sheet").then((m) => m.Sheet);
const Sheet = dynamic(loadSheet, { ssr: false });

/**
 * Phone/tablet menu (below lg): the same structure as the desktop mega-menu —
 * Parts and Devices accordions, Parts by machine, Parts brands, Guides,
 * Contact — then Request a quote, phone, WhatsApp and language.
 */
export function MobileMenu({
  nav,
  phone,
  whatsapp,
  showCart,
}: {
  nav: NavData;
  phone: string;
  whatsapp: string;
  showCart: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const tel = telHref(phone);
  const wa = whatsappHref(whatsapp, t("ui.askWhatsapp"));
  const change = (next: boolean) => {
    setOpen(next);
    if (!next) trigger.current?.focus();
  };
  const close = () => change(false);
  const row = "flex min-h-13 items-center justify-between gap-3 px-4 text-[1.0625rem] font-semibold hover:bg-re-steel-50";

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={t("a11y.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={buttonClass({ variant: "ghost", size: "icon" })}
        onPointerEnter={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <MenuIcon aria-hidden strokeWidth={1.75} />
      </button>
      {mounted && (
        <Sheet open={open} onOpenChange={change} closeLabel={t("a11y.close")} title={t("a11y.mainNav")} description={t("header.toplineShort")}>
          <nav aria-label={t("a11y.mainNav")}>
            <ul className="-mx-4 divide-y divide-re-steel-200 border-y border-re-steel-200">
              {nav.parts.length > 0 ? (
                <Accordion label={t("nav.parts")} items={nav.parts} allHref="/categories" allLabel={t("nav.allParts")} onNavigate={close} />
              ) : (
                <li>
                  <Link href="/categories" onClick={close} className={row}>
                    {t("nav.parts")}
                    <ArrowRight aria-hidden className="size-4 text-re-steel-400" />
                  </Link>
                </li>
              )}
              {nav.devices.length > 0 && (
                <Accordion label={t("nav.devices")} items={nav.devices} allHref={DEVICES_HREF} allLabel={t("nav.allDevices")} onNavigate={close} />
              )}
              {(
                [
                  ["byMachine", "/machines"],
                  ["brands", "/brands"],
                  ["guides", "/guides"],
                  ["contact", "/contact"],
                ] as const
              ).map(([key, href]) => (
                <li key={key}>
                  <Link href={href} onClick={close} className={row}>
                    {t(`nav.${key}`)}
                    <ArrowRight aria-hidden className="size-4 text-re-steel-400" />
                  </Link>
                </li>
              ))}
              {showCart && (
                <li>
                  <Link href="/cart" onClick={close} className={row}>
                    <span className="inline-flex items-center gap-2.5">
                      <ShoppingCart aria-hidden className="size-5" strokeWidth={1.75} />
                      {t("nav.cart")}
                    </span>
                    <ArrowRight aria-hidden className="size-4 text-re-steel-400" />
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <Link href="/rfq" onClick={close} className={buttonClass({ variant: "primary", size: "lg" }, "mt-5 w-full")}>
            <ClipboardList aria-hidden strokeWidth={2} />
            {t("nav.rfqLong")}
          </Link>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {tel && (
              <a href={tel} className={buttonClass({ variant: "secondary" }, "min-w-0")}>
                <Phone aria-hidden strokeWidth={1.75} />
                <span className="re-mono truncate">{phone}</span>
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp" }, cn("min-w-0", !tel && "col-span-2"))}>
                <WhatsAppIcon />
                <span className="truncate">{t("nav.whatsapp")}</span>
              </a>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-re-steel-200 pt-3">
            <span className="re-label">{t("nav.language")}</span>
            <LocaleSwitch className="border border-re-steel-200 px-3" />
          </div>
        </Sheet>
      )}
    </>
  );
}

function Accordion({
  label,
  items,
  allHref,
  allLabel,
  onNavigate,
}: {
  label: string;
  items: NavCategory[];
  allHref: string;
  allLabel: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("nav");
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-13 w-full items-center justify-between gap-3 px-4 text-left text-[1.0625rem] font-semibold hover:bg-re-steel-50"
      >
        <span className="inline-flex items-baseline gap-2">
          {label}
          <span className="re-mono text-[0.75rem] font-normal text-re-steel-600">{items.length}</span>
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={2}
          className={cn("size-4 text-re-steel-600 transition-transform duration-150 ease-re", expanded && "rotate-180")}
        />
      </button>
      <div id={id} hidden={!expanded} className="border-t border-re-steel-200 bg-re-steel-50 pb-2">
        <ul>
          {items.map((c) => {
            const Icon = PART_ICONS[c.icon];
            return (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}`}
                  onClick={onNavigate}
                  className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-1.5 text-[0.9375rem] hover:bg-re-paper"
                >
                  <span className="grid size-9 place-items-center border border-re-steel-200 bg-re-paper text-re-ink">
                    <Icon className="size-5" />
                  </span>
                  <span className="leading-snug font-medium">{c.name}</span>
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
        </ul>
        <Link href={allHref} onClick={onNavigate} className="mx-4 mt-1 inline-flex min-h-11 items-center gap-2 font-semibold text-re-ink">
          {allLabel}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </li>
  );
}
