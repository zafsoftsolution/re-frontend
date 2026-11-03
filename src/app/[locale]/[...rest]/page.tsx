import { notFound } from "next/navigation";

// Unknown paths under a locale render [locale]/not-found.tsx inside the
// localized shell (header/footer) instead of the bare global 404.
export default function CatchAll() {
  notFound();
}
