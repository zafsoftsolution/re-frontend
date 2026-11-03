// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

const nextConfig = {
  // Self-contained server bundle (.next/standalone) for the Docker image.
  output: "standalone",
  images: {
    // Placeholder tiles from placehold.co are served as SVG. Allow them with
    // the Next-recommended hardening (CSP + attachment disposition).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
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

module.exports = nextConfig;
