import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  // English lives at `/…`, Bangla at `/bn/…`.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
