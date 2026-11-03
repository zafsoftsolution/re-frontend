"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, MapPin, ArrowRight } from "lucide-react";
import { FaTiktok, FaPinterestP, FaYoutube, FaInstagram } from "react-icons/fa6";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/site";
import { storefront } from "@/lib/storefront";

const FOOTER_SECTIONS = [
  {
    title: "Shop",
    links: [
      { label: "New Arrivals", href: "/products?sort=newest" },
      { label: "Women", href: "/products?gender=women" },
      { label: "Men", href: "/products?gender=men" },
      { label: "Tailoring", href: "/categories/tailoring" },
      { label: "Outerwear", href: "/categories/outerwear" },
      { label: "Collections", href: "/collections" },
    ],
  },
  {
    title: "House",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Atelier", href: "/atelier" },
      { label: "Lookbook", href: "/lookbook" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    title: "Care",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Size Guide", href: "/size-guide" },
      { label: "Obsidian", href: "/obsidian" },
    ],
  },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      await storefront.newsletter.subscribe(email, "footer");
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <footer className="bg-navy text-cream relative overflow-hidden mt-32">
      {/* subtle gold arc */}
      <div
        aria-hidden
        className="absolute -top-56 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full border border-gold/10 pointer-events-none"
      />

      <div className="shell relative pt-24 pb-10">
        {/* Newsletter */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 pb-20 border-b border-cream/10">
          <div>
            <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-tight">
              Letters from <span className="text-gold italic">the atelier.</span>
            </h2>
            <p className="mt-6 max-w-md text-cream/70">
              New collections, studio visits, private sale access. One email a fortnight — never more.
            </p>
          </div>
          <form onSubmit={submit} className="self-end flex flex-col gap-4 max-w-md w-full">
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-transparent border-b border-cream/30 focus:border-gold outline-none py-3 pr-12 text-cream placeholder:text-cream/40 transition-colors"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full hover:bg-gold hover:text-navy transition-colors"
                aria-label="Subscribe"
              >
                <ArrowRight size={18} />
              </button>
            </div>
            {state === "done" && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-gold"
              >
                Welcome to the house. Check your inbox.
              </motion.span>
            )}
            {state === "error" && (
              <span className="text-sm text-red-300">Couldn&apos;t subscribe — try again.</span>
            )}
            <p className="text-xs tracking-wider uppercase text-cream/50">
              By subscribing you agree to our privacy policy.
            </p>
          </form>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-12 pt-16">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="font-display text-3xl tracking-[0.14em] text-cream">Rakib</span>
              <span className="h-5 w-px bg-cream/30" />
              <span className="text-[12px] tracking-[0.3em] uppercase text-cream/70">Enterprise</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm text-cream/60 leading-relaxed">
              {siteConfig.description}
            </p>

            <div className="mt-8 space-y-3 text-sm text-cream/70">
              <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-3 link-swipe">
                <Mail size={15} className="text-gold" /> {siteConfig.email}
              </a>
              <p className="flex items-center gap-3">
                <MapPin size={15} className="text-gold" /> {siteConfig.address.line1}, {siteConfig.address.city}
              </p>
            </div>

            <div className="mt-8 flex gap-2">
              {[
                { href: siteConfig.social.instagram, icon: <FaInstagram size={15} /> },
                { href: siteConfig.social.tiktok, icon: <FaTiktok size={15} /> },
                { href: siteConfig.social.pinterest, icon: <FaPinterestP size={15} /> },
                { href: siteConfig.social.youtube, icon: <FaYoutube size={15} /> },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 w-10 grid place-items-center border border-cream/20 rounded-full hover:bg-gold hover:border-gold hover:text-navy transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs tracking-[0.25em] uppercase text-gold mb-5">
                {section.title}
              </h3>
              <ul className="space-y-3 text-sm text-cream/70">
                {section.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link-swipe hover:text-cream">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-cream/10 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs tracking-wider text-cream/50">
          <p>© {new Date().getFullYear()} Rakib Enterprise. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-cream">Privacy</Link>
            <Link href="/terms" className="hover:text-cream">Terms</Link>
            <Link href="/accessibility" className="hover:text-cream">Accessibility</Link>
          </div>
          <p className="tracking-[0.3em] uppercase">Designed in NY · Made in Italy</p>
        </div>
      </div>

      {/* Oversized wordmark */}
      <div
        aria-hidden
        className="select-none pointer-events-none text-center leading-none pb-6"
      >
        <span className="font-display text-[clamp(6rem,22vw,22rem)] tracking-tight text-cream/[0.04]">
          RAKIB ENTERPRISE
        </span>
      </div>
    </footer>
  );
}
