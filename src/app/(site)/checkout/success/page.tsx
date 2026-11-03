import type { Metadata } from "next";
import OrderConfirmation from "@/components/checkout/OrderConfirmation";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Thank you — your order is on the way.",
};

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;
  return <OrderConfirmation orderId={order ?? ""} />;
}
