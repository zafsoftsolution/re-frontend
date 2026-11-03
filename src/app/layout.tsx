import type { Metadata } from "next";
import { Inter, Fraunces, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/context/AuthContext";
import { AdminProvider } from "@/context/AdminContext";
import { FeedbackProvider } from "@/context/FeedbackContext";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { siteConfig } from "@/config/site";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
});

// Bangla — Hind Siliguri pairs nicely with Inter and has good display weights.
// Globally available; CSS uses it as a fallback after Inter so glyphs render
// correctly when the locale switches to bn.
const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.shortDescription,
  keywords: [
    "fashion",
    "menswear",
    "womenswear",
    "tailoring",
    "outerwear",
    "luxury",
    "apparel",
    "Rakib Enterprise",
  ],
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    type: "website",
  },
  // Icons come from the file conventions in this folder: favicon.ico,
  // icon.png, apple-icon.png and opengraph-image.png (Rakib Enterprise logo).
};

/**
 * Root layout — fonts, providers, html/body. Chrome (Header/Footer/AdminShell)
 * is owned by the route-group layouts at `(site)/layout.tsx` and
 * `(adminportal)/admin/layout.tsx`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${hindSiliguri.variable}`}
    >
      <body className="bg-cream text-ink antialiased">
        <LocaleProvider>
          <FeedbackProvider>
            <AdminProvider>
              <AuthProvider>
                <CartProvider>
                  <WishlistProvider>{children}</WishlistProvider>
                </CartProvider>
              </AuthProvider>
            </AdminProvider>
          </FeedbackProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
