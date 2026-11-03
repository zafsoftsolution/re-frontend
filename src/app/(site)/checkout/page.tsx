import type { Metadata } from "next";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Rakib Enterprise order.",
};

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
