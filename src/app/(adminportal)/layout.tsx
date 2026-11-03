import type { Metadata } from "next";
import { Inter, Fraunces, Hind_Siliguri } from "next/font/google";
import "./admin.css";
import { AdminProvider } from "@/context/AdminContext";
import { FeedbackProvider } from "@/context/FeedbackContext";

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

// Bangla fallback after Inter so admin-entered Bangla content renders.
const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rakibenterprise-bd.com"),
  title: {
    default: "Admin — Rakib Enterprise",
    template: "%s · Rakib Enterprise",
  },
  robots: { index: false, follow: false },
  // With no app-level root layout, the src/app/opengraph-image.png file
  // convention resolves before metadataBase applies (→ localhost), so point
  // at it explicitly. Icons still come from the file conventions.
  openGraph: { images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }] },
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
      className={`${inter.variable} ${fraunces.variable} ${hindSiliguri.variable}`}
    >
      <body className="bg-cream text-ink antialiased">
        <FeedbackProvider>
          <AdminProvider>{children}</AdminProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
