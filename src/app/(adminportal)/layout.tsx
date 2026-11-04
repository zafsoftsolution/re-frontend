import type { Metadata, Viewport } from "next";
import { Archivo, Hind_Siliguri, IBM_Plex_Mono } from "next/font/google";
import "./admin.css";
import { AdminProvider } from "@/context/AdminContext";
import { FeedbackProvider } from "@/context/FeedbackContext";

// Same faces as the public site (Spec Sheet design system): Archivo for UI
// and condensed headings, IBM Plex Mono for numbers / part numbers / codes.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});

// Bangla fallback so admin-entered Bangla content (name_bn, …) renders.
// Not preloaded: most admin screens are Latin-only.
const hindSiliguri = Hind_Siliguri({
  weight: ["400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-bangla",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rakibenterprise-bd.com"),
  title: {
    default: "Admin — Rakib Enterprise",
    template: "%s · Rakib Enterprise admin",
  },
  // The console must never be indexed or followed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: "same-origin",
  // The share image is a plain public/ file (a root-level opengraph-image
  // file convention resolves before any layout's metadataBase → localhost
  // + a build warning). Icons still come from the file conventions.
  openGraph: { images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }] },
};

export const viewport: Viewport = {
  themeColor: "#231F20",
};

/**
 * Root layout for the admin console (/admin/**). One of two root layouts —
 * the public site's is src/app/[locale]/layout.tsx. Navigating between them
 * is a full page load, which is fine: they share no client state.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} ${hindSiliguri.variable}`}
    >
      <body className="bg-cream text-ink antialiased">
        <FeedbackProvider>
          <AdminProvider>{children}</AdminProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
