import type { routing } from "@/i18n/routing";
import type messages from "../messages/en.json";

// Type-safe message keys and locales for next-intl (en.json is the source of
// truth; bn.json must have the same keys — enforced by tests/unit/messages).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
