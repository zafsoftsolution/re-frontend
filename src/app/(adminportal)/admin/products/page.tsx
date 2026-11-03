import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsTable from "@/components/admin/products/ProductsTable";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  // ProductsTable reads ?search= → Suspense boundary for Cache Components.
  return (
    <Suspense fallback={null}>
      <ProductsTable />
    </Suspense>
  );
}
