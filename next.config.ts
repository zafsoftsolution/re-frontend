import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
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
