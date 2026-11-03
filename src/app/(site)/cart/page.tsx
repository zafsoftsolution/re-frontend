import type { Metadata } from "next";
import CartView from "@/components/cart/CartView";
import { productService } from "@/server/services/productService";

export const metadata: Metadata = {
  title: "Your bag",
  description: "Review your Rakib Enterprise selection before checkout.",
};

export default function CartPage() {
  const recommended = productService
    .search({ sort: "featured", page: 1, pageSize: 4 })
    .slice(0, 4);
  return <CartView recommended={recommended} />;
}
