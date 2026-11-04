import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./[locale]/site.css";

// App-wide 404 for URLs that match no route at all (e.g. /admin/typo, which
// sits outside both root layouts). Bilingual because no locale is known here.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const plexMono = IBM_Plex_Mono({ weight: ["500"], subsets: ["latin"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://rakibenterprise-bd.com"),
  title: "404 — Page not found · Rakib Enterprise",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <main className="re-shell py-16 md:py-24">
          <Link href="/" className="re-label">Rakib Enterprise</Link>
          <p className="re-mono mt-10 text-[4.5rem] leading-none font-semibold text-re-red md:text-[7rem]">404</p>
          <h1 className="mt-6 text-[2rem] md:text-[2.75rem]">This page isn&apos;t in the catalogue</h1>
          <p lang="bn" className="mt-2 text-xl text-re-steel-600">এই পেজটি ক্যাটালগে নেই</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search" className="inline-flex h-11 items-center bg-re-red-dark px-4 font-semibold text-white hover:bg-re-red-deep">
              Search parts
            </Link>
            <Link href="/" className="inline-flex h-11 items-center border border-re-ink px-4 font-semibold hover:bg-re-ink hover:text-white">
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
