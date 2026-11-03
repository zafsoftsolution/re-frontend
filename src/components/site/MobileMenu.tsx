"use client";

import { useState } from "react";
import { Menu as MenuIcon, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/button-styles";
import { telHref } from "@/lib/format";
import { PRIMARY_NAV } from "./nav";
import { LocaleSwitch } from "./LocaleSwitch";

export function MobileMenu({ phone, showCart }: { phone: string; showCart: boolean }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const tel = telHref(phone);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      closeLabel={t("a11y.close")}
      title={t("a11y.mainNav")}
      trigger={
        <button type="button" aria-label={t("a11y.openMenu")} className={buttonClass({ variant: "ghost", size: "icon" })}>
          <MenuIcon aria-hidden strokeWidth={1.75} />
        </button>
      }
    >
      <nav aria-label={t("a11y.mainNav")}>
        <ul className="-mx-4 divide-y divide-re-steel-200 border-y border-re-steel-200">
          {PRIMARY_NAV.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={close}
                className="flex min-h-13 items-center justify-between px-4 text-[1.0625rem] font-semibold hover:bg-re-steel-50"
              >
                {item.key === "rfq" ? t("nav.rfqLong") : t(`nav.${item.key}`)}
                <span aria-hidden className="text-re-steel-400">→</span>
              </Link>
            </li>
          ))}
          {showCart && (
            <li>
              <Link href="/cart" onClick={close} className="flex min-h-13 items-center px-4 text-[1.0625rem] font-semibold">
                {t("nav.cart")}
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {tel && (
          <a href={tel} className={buttonClass({ variant: "secondary" }, "flex-1")}>
            <Phone aria-hidden strokeWidth={1.75} />
            <span className="re-mono">{phone}</span>
          </a>
        )}
        <LocaleSwitch className="border border-re-steel-200 px-3" />
      </div>
    </Sheet>
  );
}
