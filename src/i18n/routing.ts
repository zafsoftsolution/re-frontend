import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  // English lives at `/…`, Bangla at `/bn/…`.
  localePrefix: "as-needed",
  // Both locales have explicit URLs: never redirect `/…` to `/bn/…` from
  // Accept-Language or the NEXT_LOCALE cookie (an English URL stays English
  // after visiting /bn, and crawlers always get the URL they asked for).
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
