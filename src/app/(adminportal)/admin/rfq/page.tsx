import { Suspense } from "react";
import type { Metadata } from "next";
import QuotesInbox from "@/components/admin/quotes/QuotesInbox";

export const metadata: Metadata = { title: "Quotes" };

export default function AdminQuotesPage() {
  // QuotesInbox reads ?search= / ?status= (useSearchParams) → needs a
  // Suspense boundary under Cache Components.
  return (
    <Suspense fallback={null}>
      <QuotesInbox />
    </Suspense>
  );
}
