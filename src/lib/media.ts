/**
 * Catalogue image sources. Django media is optimised by next/image (AVIF /
 * WebP, sized); anything else — admin-pasted URLs on other hosts, SVG
 * placeholders — is rendered as-is (`unoptimized`) because next/image only
 * optimises hosts listed in next.config.ts `images.remotePatterns`.
 * Keep `optimizableHosts` in sync with that list.
 */
const PROD_MEDIA_HOST = "api.rakibenterprise-bd.com";

function backendOrigin(): string {
  // Literal reference so Next inlines it into client bundles too.
  const raw = process.env.NEXT_PUBLIC_DJANGO_BACKEND?.trim() || `https://${PROD_MEDIA_HOST}`;
  return raw.replace(/\/+$/, "");
}

function optimizableHosts(): Set<string> {
  const hosts = new Set([PROD_MEDIA_HOST]);
  try {
    hosts.add(new URL(backendOrigin()).host);
  } catch {
    /* ignore malformed env */
  }
  return hosts;
}

export interface ImageSource {
  src: string;
  unoptimized: boolean;
}

/** Resolve a backend image value (absolute URL or "/media/…" path). */
export function imageSource(raw: string | null | undefined): ImageSource | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(v, `${backendOrigin()}/`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const svg = /\.svg$/i.test(url.pathname) || url.hostname === "placehold.co";
  const optimizable = !svg && optimizableHosts().has(url.host) && url.pathname.startsWith("/media/");
  return { src: url.toString(), unoptimized: !optimizable };
}
