"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, User, Heart, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useTranslate } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/i18n/messages";

interface NavLink {
  labelKey: MessageKey;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { labelKey: "header.new_in", href: "/products?sort=newest" },
  { labelKey: "header.women", href: "/products" },
  { labelKey: "header.men", href: "/categories" },
  { labelKey: "header.collections", href: "/brands" },
  { labelKey: "header.lookbook", href: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count: cartCount, open: openCart } = useCart();
  const { count: wishCount } = useWishlist();
  const t = useTranslate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-navy text-cream text-[11px] tracking-[0.22em] uppercase">
        <div className="shell flex h-9 items-center justify-center gap-8 overflow-hidden">
          <motion.span
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            New drops every Friday
          </motion.span>
          <span className="hidden md:inline text-gold">·</span>
          <span className="hidden md:inline text-gold/90">
            Members get early access
          </span>
        </div>
      </div>

      {/* Main bar */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-cream/85 backdrop-blur-md border-b border-[var(--jmn-line)]"
            : "bg-transparent"
        )}
      >
        <div className="shell flex h-20 items-center justify-between relative">
          <div className="flex items-center gap-6">
            <button
              aria-label="Open menu"
              className="lg:hidden grid place-items-center h-10 w-10 -ml-2"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <nav className="hidden lg:flex items-center gap-7 text-sm">
              {NAV_LINKS.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="link-swipe text-ink/85 hover:text-ink tracking-wide"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          <Link
            href="/"
            className="group absolute left-1/2 -translate-x-1/2 flex items-center gap-3"
            aria-label="Rakib Enterprise — home"
          >
            <Image
              src="/logo/rakib-enterprise.png"
              alt="Rakib Enterprise"
              width={434}
              height={240}
              priority
              className="h-9 w-auto sm:h-10"
            />
            <span className="hidden md:block font-display text-2xl tracking-[0.14em] text-navy leading-none">
              Rakib
            </span>
            <span className="hidden md:block h-4 w-px bg-navy/30" />
            <span className="hidden md:block text-[11px] tracking-[0.3em] text-navy/70 uppercase">
              Enterprise
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden lg:flex items-center gap-7 text-sm">
              {NAV_LINKS.slice(3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="link-swipe text-ink/85 hover:text-ink tracking-wide"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <IconButton aria-label={t("header.search")} href="/products">
                <Search size={18} />
              </IconButton>
              <IconButton aria-label={t("header.account")} href="/account">
                <User size={18} />
              </IconButton>
              <IconButton
                aria-label={t("header.wishlist")}
                href="/wishlist"
                badge={wishCount}
              >
                <Heart size={18} />
              </IconButton>
              <button
                onClick={openCart}
                aria-label={t("header.cart")}
                className="relative grid place-items-center h-10 w-10 rounded-full hover:bg-navy hover:text-cream transition-colors"
              >
                <ShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold text-navy text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center tabular">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-navy text-cream"
          >
            <div className="shell flex items-center justify-between h-20">
              <span className="flex items-center gap-3">
                <Image
                  src="/logo/rakib-enterprise-light.png"
                  alt=""
                  width={434}
                  height={240}
                  className="h-9 w-auto"
                />
                <span className="font-display text-xl tracking-widest">Rakib Enterprise</span>
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="grid place-items-center h-10 w-10"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="shell py-8 flex flex-col gap-2">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block font-display text-5xl tracking-tight py-3 text-cream/90 hover:text-gold transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function IconButton({
  children,
  href,
  badge,
  ...rest
}: {
  children: React.ReactNode;
  href: string;
  badge?: number;
} & React.HTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      {...rest}
      className="relative grid place-items-center h-10 w-10 rounded-full hover:bg-navy hover:text-cream transition-colors"
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-gold text-navy text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center tabular">
          {badge}
        </span>
      )}
    </Link>
  );
}
