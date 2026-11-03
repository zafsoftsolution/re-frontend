import type { Metadata } from "next";
import QuoteDetail from "@/components/admin/quotes/QuoteDetail";

export const metadata: Metadata = { title: "Quote" };

export default async function AdminQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuoteDetail id={id} />;
}
