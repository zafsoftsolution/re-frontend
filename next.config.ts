import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The configured backend's media host (e.g. a staging or local Django), in
// addition to production. Mirrors src/lib/media.ts. Local backends need
// dangerouslyAllowLocalIP — only ever enabled for a loopback backend.
const backendMedia = (() => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_DJANGO_BACKEND || "https://api.rakibenterprise-bd.com");
    return { protocol: u.protocol.replace(":", "") as "http" | "https", hostname: u.hostname, port: u.port, local: ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the Docker image.
  output: "standalone",

  // Cache Components: data is dynamic by default; the public site opts in to
  // caching with `'use cache'` + cacheLife/cacheTag (see src/lib/api/).
  cacheComponents: true,
  partialPrefetching: true,

  experimental: {
    // Two root layouts ((adminportal) and [locale]) → no single layout to
    // compose an app-wide 404 from. See src/app/global-not-found.tsx.
    globalNotFound: true,
  },

  // /sitemap.xml is the sitemap index. src/app/sitemap.ts (generateSitemaps
  // → /sitemap/<id>.xml) also claims the /sitemap.xml route, so the index
  // handler lives at /sitemap-index.xml and this serves it under the
  // conventional name robots.txt points to.
  async rewrites() {
    return { beforeFiles: [{ source: "/sitemap.xml", destination: "/sitemap-index.xml" }], afterFiles: [], fallback: [] };
  },

  images: {
    formats: ["image/avif", "image/webp"],
    ...(backendMedia?.local ? { dangerouslyAllowLocalIP: true } : {}),
    remotePatterns: [
      ...(backendMedia && backendMedia.hostname !== "api.rakibenterprise-bd.com"
        ? [{ protocol: backendMedia.protocol, hostname: backendMedia.hostname, port: backendMedia.port, pathname: "/media/**" }]
        : []),
      // Backend media uploads (Django MEDIA_URL). Both protocols are allowed
      // because the API currently returns http:// URLs.
      {
        protocol: "https",
        hostname: "api.rakibenterprise-bd.com",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "api.rakibenterprise-bd.com",
        pathname: "/media/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
