import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/** Namespaces the root layout already ships to client components. */
const BASE = ["a11y", "header", "nav", "rfq", "ui"] as const;

/**
 * Ships extra message namespaces to the client components below it (cart,
 * checkout, contact form). next-intl treats `messages` as one atomic prop,
 * so the layout's namespaces are merged back in.
 */
export async function IntlScope({ namespaces, children }: { namespaces: string[]; children: ReactNode }) {
  const messages = await getMessages();
  const picked = Object.fromEntries([...BASE, ...namespaces].map((ns) => [ns, messages[ns as keyof typeof messages]]));
  return <NextIntlClientProvider messages={picked}>{children}</NextIntlClientProvider>;
}
