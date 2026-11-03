import type { Metadata } from "next";
import WishlistView from "@/components/wishlist/WishlistView";
import { productService } from "@/server/services/productService";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved Rakib Enterprise pieces — ready when you are.",
};

export default function WishlistPage() {
  const recommended = productService
    .search({ sort: "featured", page: 1, pageSize: 8 })
    .slice(0, 8);
  return <WishlistView recommended={recommended} />;
}
