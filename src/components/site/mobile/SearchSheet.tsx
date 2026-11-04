"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Camera, History, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { WhatsAppIcon } from "@/components/icons/brand";
import { PART_ICONS } from "@/components/icons/parts";
import { inputClass } from "@/components/ui/Input";
import { whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NavCategory } from "../nav";
import { FullSheet, SheetClose } from "./FullSheet";
import { RECENT_KEY, loadRecent, pushRecent, removeRecent, saveRecent } from "./recent-searches";

export interface SearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Real part numbers from the catalogue, for the "try" chips. */
  examples: string[];
  popular: NavCategory[];
  whatsapp: string;
}

// Recent searches as an external store: read lazily on the client, empty on
// the server, re-read whenever this tab or another one changes them.
const listeners = new Set<() => void>();
let snapshot: string[] | null = null;
const recentStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_KEY) {
        snapshot = null;
        cb();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  },
  get: () => (snapshot ??= loadRecent()),
  set(next: string[]) {
    snapshot = next;
    saveRecent(next);
    listeners.forEach((l) => l());
  },
};
const EMPTY: string[] = [];

/**
 * Full-screen part search for phones: the field is focused on open; below it
 * recent searches (this device only), real part-number examples, popular part
 * types and the "send a photo on WhatsApp" way out for buyers without a number.
 */
export function SearchSheet({ open, onOpenChange, examples, popular, whatsapp }: SearchSheetProps) {
  const t = useTranslations();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.get, () => EMPTY);
  const wa = whatsappHref(whatsapp, t("site.search.photoMessage"));
  const close = () => onOpenChange(false);

  const go = (raw: string) => {
    const q = raw.replace(/\s+/g, " ").trim();
    if (!q) {
      input.current?.focus();
      return;
    }
    recentStore.set(pushRecent(recentStore.get(), q));
    close();
    router.push({ pathname: "/search", query: { q } });
  };

  const sectionLabel = "re-label px-4 pb-2";

  return (
    <FullSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("site.search.title")}
      titleHidden
      closeLabel={t("site.search.close")}
      initialFocus={input}
      header={
        <div className="relative flex h-16 shrink-0 items-center gap-1 border-b border-re-steel-200 bg-re-paper pr-3 pl-1">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-re-red" />
          <SheetClose
            aria-label={t("site.search.close")}
            className="grid size-12 shrink-0 place-items-center text-re-ink active:bg-re-steel-100"
          >
            <ArrowLeft aria-hidden className="size-6" strokeWidth={1.75} />
          </SheetClose>
          <form
            role="search"
            className="flex min-w-0 flex-1 items-stretch"
            onSubmit={(e) => {
              e.preventDefault();
              go(value);
            }}
          >
            <label className="relative flex min-w-0 flex-1 items-center">
              <span className="sr-only">{t("header.searchLabel")}</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 size-[1.125rem] text-re-steel-600" strokeWidth={1.75} />
              <input
                ref={input}
                type="search"
                name="q"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                placeholder={t("site.search.placeholder")}
                className={cn(
                  inputClass,
                  "re-mono h-12 rounded-r-none border-r-0 pr-9 pl-10 text-base placeholder:font-re-sans [&::-webkit-search-cancel-button]:hidden",
                )}
              />
              {value && (
                <button
                  type="button"
                  aria-label={t("site.search.clearField")}
                  onClick={() => {
                    setValue("");
                    input.current?.focus();
                  }}
                  className="absolute right-0 grid size-11 place-items-center text-re-steel-600"
                >
                  <X aria-hidden className="size-4" strokeWidth={2} />
                </button>
              )}
            </label>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-r-re bg-re-ink px-4 text-[0.9375rem] font-semibold text-white active:bg-re-red-dark"
            >
              {t("site.search.submit")}
            </button>
          </form>
        </div>
      }
    >
      <div className="space-y-7 pt-5 pb-8">
        {recent.length > 0 && (
          <section aria-labelledby="re-ss-recent">
            <div className="flex items-center justify-between pr-2">
              <h2 id="re-ss-recent" className={cn(sectionLabel, "pb-0")}>
                {t("site.search.recent")}
              </h2>
              <button
                type="button"
                onClick={() => recentStore.set([])}
                className="inline-flex min-h-11 items-center px-2 text-[0.875rem] font-semibold text-re-blue"
              >
                {t("site.search.clearRecent")}
              </button>
            </div>
            <ul className="divide-y divide-re-steel-200 border-y border-re-steel-200 bg-re-paper">
              {recent.map((q) => (
                <li key={q} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => go(q)}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 pl-4 text-left active:bg-re-steel-50"
                  >
                    <History aria-hidden className="size-[1.125rem] shrink-0 text-re-steel-600" strokeWidth={1.75} />
                    <span className="re-mono truncate text-[0.9375rem]">{q}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={t("site.search.removeRecent", { query: q })}
                    onClick={() => recentStore.set(removeRecent(recentStore.get(), q))}
                    className="grid w-12 shrink-0 place-items-center text-re-steel-600 active:bg-re-steel-50"
                  >
                    <X aria-hidden className="size-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {examples.length > 0 && (
          <section aria-labelledby="re-ss-examples">
            <h2 id="re-ss-examples" className={sectionLabel}>
              {t("site.search.examples")}
            </h2>
            <ul className="flex flex-wrap gap-2 px-4">
              {examples.map((pn) => (
                <li key={pn}>
                  <button
                    type="button"
                    onClick={() => go(pn)}
                    className="re-mono inline-flex min-h-11 items-center border border-re-steel-500 bg-re-paper px-3 text-[0.875rem] text-re-ink active:border-re-ink active:bg-re-ink active:text-white"
                  >
                    {pn}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-4 text-[0.8125rem] text-re-steel-600">{t("site.search.hint")}</p>
          </section>
        )}

        {popular.length > 0 && (
          <section aria-labelledby="re-ss-popular">
            <h2 id="re-ss-popular" className={sectionLabel}>
              {t("site.search.popular")}
            </h2>
            <ul className="grid grid-cols-2 gap-px border-y border-re-steel-200 bg-re-steel-200">
              {popular.map((c) => {
                const Icon = PART_ICONS[c.icon];
                return (
                  <li key={c.slug} className="flex">
                    <Link
                      href={`/categories/${c.slug}`}
                      onClick={close}
                      className="flex min-h-16 min-w-0 flex-1 items-center gap-3 bg-re-paper px-3 py-2 active:bg-re-steel-50"
                    >
                      <Icon className="size-7 shrink-0 text-re-ink" />
                      <span className="min-w-0 text-[0.9375rem] leading-snug font-semibold [overflow-wrap:anywhere]">{c.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/categories"
              onClick={close}
              className="mx-4 mt-2 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-re-ink"
            >
              {t("site.search.allParts")}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </section>
        )}

        {wa && (
          <section aria-labelledby="re-ss-photo" className="mx-4 border border-re-steel-200 border-l-[3px] border-l-re-whatsapp bg-re-paper p-4">
            <div className="flex gap-3">
              <Camera aria-hidden className="mt-0.5 size-6 shrink-0 text-re-whatsapp" strokeWidth={1.75} />
              <div className="min-w-0">
                <h2 id="re-ss-photo" className="text-[1.0625rem] font-bold">
                  {t("site.search.photoTitle")}
                </h2>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-re-steel-600">{t("site.search.photoBody")}</p>
              </div>
            </div>
            <a
              href={wa}
              target="_blank"
              rel="noopener"
              className="mt-4 flex h-12 items-center justify-center gap-2 bg-re-whatsapp px-4 font-semibold text-white active:bg-re-whatsapp-dark"
            >
              <WhatsAppIcon className="size-5" />
              {t("site.search.photoCta")}
            </a>
          </section>
        )}
      </div>
    </FullSheet>
  );
}
