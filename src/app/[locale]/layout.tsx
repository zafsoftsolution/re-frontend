import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Anek_Bangla, Archivo, Hind_Siliguri, IBM_Plex_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getBootstrap } from "@/lib/api/site";
import { getCurrentYear } from "@/lib/clock";
import { organizationJsonLd, SITE_URL } from "@/lib/seo/jsonld";
import { siteNoindex } from "@/lib/seo/robots";
import { JsonLd } from "@/components/catalog/JsonLd";
import { Analytics } from "@/components/site/Analytics";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomBar } from "@/components/site/MobileBottomBar";
import { navData } from "@/components/site/nav";
import { organizationFacts } from "@/config/business";
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
  if (!hasLocale(routing.locales, locale)) return { metadataBase: new URL(SITE_URL) };
  const [t, boot] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getBootstrap(locale)]);
  const { seo, verification } = boot.settings;
  // Admin-set defaults are written in English; Bangla keeps its messages.
  const title = (locale === routing.defaultLocale && seo.title) || t("title");
  const description = (locale === routing.defaultLocale && seo.description) || t("description");
  const other: Record<string, string> = {};
  if (verification.bing) other["msvalidate.01"] = verification.bing;
  if (verification.pinterest) other["p:domain_verify"] = verification.pinterest;
  if (verification.facebook) other["facebook-domain-verification"] = verification.facebook;
  const twitterHandle = seo.twitterHandle ? `@${seo.twitterHandle.replace(/^@/, "")}` : undefined;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${t("siteName")}` },
    description,
    applicationName: "Rakib Enterprise",
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: locale === "bn" ? "bn_BD" : "en_BD",
      alternateLocale: locale === "bn" ? ["en_BD"] : ["bn_BD"],
      // public/opengraph-image.png (not a file convention: a root-level one
      // resolves before metadataBase and falls back to localhost).
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: t("siteName") }],
    },
    twitter: { card: "summary_large_image", ...(twitterHandle ? { site: twitterHandle } : {}) },
    // Staging switch: Settings → SEO → default robots "noindex…" hides the
    // whole site (pages' own noindex still applies otherwise).
    ...(siteNoindex(seo.defaultRobots) ? { robots: { index: false, follow: false } } : {}),
    ...(verification.google || Object.keys(other).length
      ? { verification: { ...(verification.google ? { google: verification.google } : {}), ...(Object.keys(other).length ? { other } : {}) } }
      : {}),
    formatDetection: { telephone: false },
    // Icons + OG image come from the file conventions in src/app.
  };
}

/** NextIntlClientProvider only ships the namespaces client components use. */
const CLIENT_NAMESPACES = ["a11y", "header", "nav", "rfq", "ui", "fixes"] as const;

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
  const s = boot.settings;
  const meta = messages.meta as Record<string, string>;
  const nav = navData(boot.categories, boot.machineBrands);

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
          <Header settings={boot.settings} nav={nav} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer settings={boot.settings} year={year} showDevices={nav.devices.length > 0} />
          <MobileBottomBar whatsapp={boot.settings.whatsappNumber || boot.settings.contactPhone} />
        </NextIntlClientProvider>
        <JsonLd
          data={organizationJsonLd({
            name: s.siteName || meta.siteName,
            description: meta.description,
            logoUrl: s.logoUrl,
            social: s.social,
            ...organizationFacts(s),
          })}
        />
        <Analytics analytics={s.analytics} />
      </body>
    </html>
  );
}
