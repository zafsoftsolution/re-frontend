import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Anek_Bangla, Archivo, Hind_Siliguri, IBM_Plex_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getBootstrap } from "@/lib/api/site";
import { getCurrentYear } from "@/lib/clock";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomBar } from "@/components/site/MobileBottomBar";
import "./site.css";

// Latin display/body — variable, with the width axis for condensed headings.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

// Part numbers, model codes, specs, prices.
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});

// Bangla faces are not preloaded: en pages never use them, and on bn pages
// the browser fetches them via unicode-range as soon as Bangla text renders.
const anekBangla = Anek_Bangla({
  subsets: ["bengali"],
  display: "swap",
  variable: "--font-anek",
  preload: false,
});

const hindSiliguri = Hind_Siliguri({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "bengali"],
  display: "swap",
  variable: "--font-hind",
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#231F20",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return { metadataBase: new URL("https://rakibenterprise-bd.com") };
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL("https://rakibenterprise-bd.com"),
    title: { default: t("title"), template: `%s · ${t("siteName")}` },
    description: t("description"),
    applicationName: "Rakib Enterprise",
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: locale === "bn" ? "bn_BD" : "en_BD",
      alternateLocale: locale === "bn" ? ["en_BD"] : ["bn_BD"],
      // Setting openGraph here replaces the inherited file-convention image,
      // so reference src/app/opengraph-image.png explicitly.
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: t("siteName") }],
    },
    formatDetection: { telephone: false },
    // Icons + OG image come from the file conventions in src/app.
  };
}

/** NextIntlClientProvider only ships the namespaces client components use. */
const CLIENT_NAMESPACES = ["a11y", "header", "nav", "rfq", "ui"] as const;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [boot, year, messages, t] = await Promise.all([
    getBootstrap(locale),
    getCurrentYear(),
    getMessages(),
    getTranslations("a11y"),
  ]);
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${plexMono.variable} ${anekBangla.variable} ${hindSiliguri.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider messages={clientMessages}>
          <a
            href="#main"
            className="sr-only z-50 bg-re-ink px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          <Header settings={boot.settings} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer settings={boot.settings} year={year} />
          <MobileBottomBar whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
