import type { MetadataRoute } from "next";

/** /manifest.webmanifest — install metadata; icons are the src/app file-convention icons. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rakib Enterprise — Spare parts & devices for industrial sewing machines",
    short_name: "Rakib",
    description: "Genuine and compatible spare parts and devices for industrial garment sewing machines, Dhaka. We supply parts, not machines. Search by part number or machine model and request a quote.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en",
    background_color: "#ffffff",
    theme_color: "#231F20",
    categories: ["business", "shopping"],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
