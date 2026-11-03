"use client";

/**
 * Lightweight i18n provider — no library dependency.
 *
 *   const t = useTranslate();
 *   t("cart.title");                              // "Your bag" / "আপনার ব্যাগ"
 *   t("cart.free_shipping_remaining", { amount: "৳ 80" });
 *
 *   const { locale, setLocale } = useLocale();
 *   setLocale("bn");
 *
 * Persistence:
 *   - Cookie `NEXT_LOCALE` (read by next-server / middleware if added later)
 *   - localStorage `jmn:locale` (synced for redundancy)
 *
 * The Accept-Language header on storefront API calls is set by the
 * storefront client (see lib/storefront.ts) so the backend serves Bangla
 * model fields when locale is `bn`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  MESSAGES,
  SUPPORTED_LOCALES,
  type Locale,
  type MessageKey,
} from "./messages";

const COOKIE_NAME = "NEXT_LOCALE";
const STORAGE_KEY = "jmn:locale";

interface LocaleCtx {
  locale: Locale;
  setLocale: (loc: Locale) => void;
}

const Ctx = createContext<LocaleCtx | null>(null);

function readCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (!match) return null;
  const v = decodeURIComponent(match[1]);
  return (SUPPORTED_LOCALES as string[]).includes(v) ? (v as Locale) : null;
}

function readStorage(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && (SUPPORTED_LOCALES as string[]).includes(v) ? (v as Locale) : null;
  } catch {
    return null;
  }
}

function writePersistent(locale: Locale): void {
  if (typeof document !== "undefined") {
    // 1-year cookie, available to server requests too if we add SSR later.
    document.cookie = `${COOKIE_NAME}=${locale}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  /** Optional pre-resolved locale (e.g. from a server cookie read). */
  initialLocale?: Locale;
}) {
  // Hydrate from props/cookie/storage. The provider is mounted at the root
  // layout, so this runs exactly once per SPA load.
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? DEFAULT_LOCALE,
  );

  useEffect(() => {
    const resolved = readCookie() ?? readStorage();
    if (resolved && resolved !== locale) {
      setLocaleState(resolved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the locale onto the <html> element so global CSS (and any third
  // party that respects `lang`) can react to it.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("data-locale", locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!(SUPPORTED_LOCALES as string[]).includes(next)) return;
    writePersistent(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useLocale(): LocaleCtx {
  const c = useContext(Ctx);
  if (!c) {
    // Provider may be missing in storybook / isolated tests — degrade gracefully.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {
        /* no-op without provider */
      },
    };
  }
  return c;
}

/**
 * `t("section.key", { name: "Aisha" })` → resolves to a string in the
 * current locale, with `{placeholder}` substitutions. Falls back to the
 * default-locale message when a key is missing in the active locale, then
 * to the key itself if even that's absent (so missing translations are
 * visible in dev rather than rendering blank).
 */
export function useTranslate(): (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string {
  const { locale } = useLocale();
  return useCallback(
    (key, vars) => {
      const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
      const fallback = MESSAGES[DEFAULT_LOCALE];
      const raw =
        (messages as Record<string, string>)[key] ??
        (fallback as Record<string, string>)[key] ??
        key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, name) =>
        name in vars ? String(vars[name]) : `{${name}}`,
      );
    },
    [locale],
  );
}
