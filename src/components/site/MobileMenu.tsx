"use client";

import { useId, useState, type ComponentType, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { BookOpen, Building2, ChevronDown, ChevronRight, Clock, FileText, Menu as MenuIcon, MessageSquareText, Phone, PhoneCall, ShoppingCart, Tags, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { PART_ICONS } from "@/components/icons/parts";
import { QuoteCount } from "@/components/ui/ListCount";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LocaleSegmented } from "./mobile/LocaleSegmented";
import { NutIcon, QuoteIcon, SewingMachineIcon } from "./mobile/tab-icons";
import { DEVICES_HREF, type NavCategory, type NavData } from "./nav";

// The sheet (Base UI dialog) is only fetched when the menu is about to be used.
const loadSheet = () => import("./mobile/FullSheet").then((m) => m.FullSheet);
const FullSheet = dynamic(loadSheet, { ssr: false });

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

/**
 * Phone/tablet menu (below lg), laid out like a native settings screen:
 * Request a quote · Catalogue (Parts, Devices, Find parts by machine, Parts
 * brands, Guides) · Company (About, Contact, Delivery, Policies) · a contact
 * card (mobile, landline, WhatsApp, hours) · language as a segmented control.
 */
export function MobileMenu({
  nav,
  phone,
  phoneSecondary,
  whatsapp,
  hours,
  showCart,
}: {
  nav: NavData;
  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  hours: string;
  showCart: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tel = telHref(phone);
  const tel2 = telHref(phoneSecondary);
  const wa = whatsappHref(whatsapp, t("ui.askWhatsapp"));
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("a11y.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid size-11 place-items-center text-re-ink hover:bg-re-steel-100 active:bg-re-steel-100"
        onPointerEnter={() => void loadSheet()}
        onPointerDown={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <MenuIcon aria-hidden className="size-6" strokeWidth={1.75} />
      </button>
      {mounted && (
        <FullSheet open={open} onOpenChange={setOpen} title={t("site.menu.title")} closeLabel={t("a11y.close")}>
          <nav aria-label={t("a11y.mainNav")} className="space-y-6 pt-4 pb-6">
            {/* The primary action, first. */}
            <ul className="border-y border-re-steel-200 bg-re-paper">
              <li>
                <Link
                  href="/rfq"
                  onClick={close}
                  className="grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] border-re-red py-2 pr-4 pl-[calc(1rem-3px)] active:bg-re-steel-50"
                >
                  <span className="relative grid size-10 place-items-center bg-re-red-dark text-white">
                    <QuoteIcon className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[1.0625rem] leading-snug font-bold">{t("site.menu.rfq")}</span>
                    <span className="block text-[0.8125rem] leading-snug text-re-steel-600">{t("site.menu.rfqSub")}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <QuoteCount />
                    <ChevronRight aria-hidden className="size-5 text-re-steel-500" strokeWidth={1.75} />
                  </span>
                </Link>
              </li>
              {showCart && (
                <Row href="/cart" icon={ShoppingCart} onNavigate={close}>
                  {t("nav.cart")}
                </Row>
              )}
            </ul>

            <Group label={t("site.menu.catalogue")}>
              {nav.parts.length > 0 ? (
                <Accordion icon={NutIcon} label={t("nav.parts")} items={nav.parts} allHref="/categories" allLabel={t("nav.allParts")} onNavigate={close} />
              ) : (
                <Row href="/categories" icon={NutIcon} onNavigate={close}>
                  {t("nav.parts")}
                </Row>
              )}
              {nav.devices.length > 0 && (
                <Accordion
                  icon={PART_ICONS.servoMotor}
                  label={t("nav.devices")}
                  items={nav.devices}
                  allHref={DEVICES_HREF}
                  allLabel={t("nav.allDevices")}
                  onNavigate={close}
                />
              )}
              <li>
                <RowLink href="/machines" icon={SewingMachineIcon} onNavigate={close}>
                  {t("nav.machinesTitle")}
                </RowLink>
                {nav.machineBrands.length > 0 && (
                  <ul aria-label={t("site.menu.popularMachines")} className="flex flex-wrap gap-2 px-4 pb-3 pl-[4.25rem]">
                    {nav.machineBrands.slice(0, 8).map((b) => (
                      <li key={b.slug}>
                        <Link
                          href={`/machines/${b.slug}`}
                          onClick={close}
                          className="inline-flex min-h-11 items-center border border-re-steel-200 bg-re-steel-50 px-3 text-[0.875rem] font-semibold active:border-re-ink"
                        >
                          {b.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              <Row href="/brands" icon={Tags} onNavigate={close}>
                {t("nav.brands")}
              </Row>
              <Row href="/guides" icon={BookOpen} onNavigate={close}>
                {t("nav.guides")}
              </Row>
            </Group>

            <Group label={t("site.menu.company")}>
              <Row href="/about" icon={Building2} onNavigate={close}>
                {t("site.menu.about")}
              </Row>
              <Row href="/contact" icon={MessageSquareText} onNavigate={close}>
                {t("nav.contact")}
              </Row>
              <Row href="/delivery" icon={Truck} onNavigate={close}>
                {t("site.menu.delivery")}
              </Row>
              <Row href="/policies" icon={FileText} onNavigate={close}>
                {t("site.menu.policies")}
              </Row>
            </Group>
          </nav>

          <section aria-labelledby="re-menu-talk" className="pb-6">
            <h2 id="re-menu-talk" className="re-label px-4 pb-2">
              {t("site.menu.talk")}
            </h2>
            <ul className="divide-y divide-re-steel-200 border-y border-re-steel-200 bg-re-paper">
              {tel && (
                <ContactRow href={tel} icon={Phone} label={t("site.menu.callMobile")} value={phone} />
              )}
              {tel2 && (
                <ContactRow href={tel2} icon={PhoneCall} label={t("site.menu.callLandline")} value={phoneSecondary} />
              )}
              <li className="grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 px-4 py-2">
                <Clock aria-hidden className="mx-auto size-5 text-re-steel-600" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] text-re-steel-600">{t("site.menu.hours")}</span>
                  <span className="block text-[0.9375rem] font-semibold">{hours}</span>
                </span>
              </li>
            </ul>
            {wa && (
              <div className="px-4 pt-3">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener"
                  className="flex h-12 items-center justify-center gap-2 bg-re-whatsapp px-4 font-semibold text-white active:bg-re-whatsapp-dark"
                >
                  <WhatsAppIcon className="size-5" />
                  {t("nav.whatsapp")}
                </a>
              </div>
            )}
          </section>

          <section aria-labelledby="re-menu-lang" className="px-4 pb-8">
            <h2 id="re-menu-lang" className="re-label pb-2">
              {t("site.menu.language")}
            </h2>
            <LocaleSegmented label={t("site.menu.language")} />
          </section>
        </FullSheet>
      )}
    </>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="re-label px-4 pb-2">
        {label}
      </h2>
      <ul className="divide-y divide-re-steel-200 border-y border-re-steel-200 bg-re-paper">{children}</ul>
    </section>
  );
}

const rowClass =
  "grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-1.5 text-left text-[1.0625rem] font-semibold leading-snug active:bg-re-steel-50";

function IconBox({ icon: Icon }: { icon: IconType }) {
  return (
    <span className="grid size-9 place-items-center border border-re-steel-200 text-re-ink">
      <Icon className="size-5" strokeWidth={1.5} />
    </span>
  );
}

function RowLink({ href, icon, onNavigate, children }: { href: string; icon: IconType; onNavigate: () => void; children: ReactNode }) {
  return (
    <Link href={href} onClick={onNavigate} className={rowClass}>
      <IconBox icon={icon} />
      <span className="min-w-0">{children}</span>
      <ChevronRight aria-hidden className="size-5 text-re-steel-500" strokeWidth={1.75} />
    </Link>
  );
}

function Row(props: { href: string; icon: IconType; onNavigate: () => void; children: ReactNode }) {
  return (
    <li>
      <RowLink {...props} />
    </li>
  );
}

function ContactRow({ href, icon: Icon, label, value }: { href: string; icon: IconType; label: string; value: string }) {
  return (
    <li>
      <a href={href} className="grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 active:bg-re-steel-50">
        <Icon className="mx-auto size-5 text-re-ink" strokeWidth={1.75} />
        <span className="min-w-0">
          <span className="block text-[0.8125rem] text-re-steel-600">{label}</span>
          <span className="re-mono block text-[1rem] font-semibold">{value}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-re-steel-500" strokeWidth={1.75} />
      </a>
    </li>
  );
}

function Accordion({
  icon,
  label,
  items,
  allHref,
  allLabel,
  onNavigate,
}: {
  icon: IconType;
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
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((v) => !v)} className={cn(rowClass, "w-full")}>
        <IconBox icon={icon} />
        <span className="flex min-w-0 items-baseline gap-2">
          {label}
          <span className="re-mono text-[0.75rem] font-normal text-re-steel-600">{items.length}</span>
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className={cn("size-5 text-re-steel-500 transition-transform duration-150 ease-re", expanded && "rotate-180 text-re-ink")}
        />
      </button>
      <div id={id} hidden={!expanded} className="border-t border-re-steel-200 bg-re-steel-50">
        <ul className="divide-y divide-re-steel-200/70">
          {items.map((c) => {
            const Icon = PART_ICONS[c.icon];
            return (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}`}
                  onClick={onNavigate}
                  className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-1.5 text-[0.9375rem] active:bg-re-paper"
                >
                  <Icon className="mx-auto size-6 text-re-ink" />
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
        <Link
          href={allHref}
          onClick={onNavigate}
          className="flex min-h-12 items-center gap-2 border-t border-re-steel-200 pr-4 pl-[4.25rem] font-semibold text-re-ink"
        >
          {allLabel}
          <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
        </Link>
      </div>
    </li>
  );
}
