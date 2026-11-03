import type { Metadata } from "next";
import ProductImport from "@/components/admin/products/ProductImport";

export const metadata: Metadata = { title: "Import parts" };

export default function AdminProductImportPage() {
  return <ProductImport />;
}
