import { nanoid } from "nanoid";
import type { CartItem, Order, OrderLineItem, OrderStatus } from "@/types";
import { couponRepo, orderRepo, productRepo } from "../db";
import type { CheckoutInput } from "../validators";

const TAX_RATE = 0.08;
const FREE_SHIPPING = 150;

export const orderService = {
  computeTotals(items: CartItem[], couponCode?: string) {
    const lineItems: OrderLineItem[] = items.map((i) => {
      const p = productRepo.findById(i.productId) ?? i.product;
      return {
        productId: p.id,
        productName: p.name,
        productImage: p.images[0],
        sku: p.sku,
        size: i.selectedSize,
        color: i.selectedColor,
        quantity: i.quantity,
        unitPrice: p.price,
        total: p.price * i.quantity,
      };
    });
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);

    let discount = 0;
    let shippingOverride: number | null = null;
    const coupon = couponCode ? couponRepo.findByCode(couponCode) : null;
    if (coupon?.active) {
      if (coupon.minSpend && subtotal < coupon.minSpend) {
        // coupon doesn't apply — no discount
      } else if (coupon.type === "percent") {
        discount = Math.min(coupon.maxDiscount ?? Infinity, (subtotal * coupon.value) / 100);
      } else if (coupon.type === "fixed") {
        discount = Math.min(subtotal, coupon.value);
      } else if (coupon.type === "shipping") {
        shippingOverride = 0;
      }
    }

    const postDiscount = subtotal - discount;
    const shipping =
      shippingOverride ?? (postDiscount >= FREE_SHIPPING || postDiscount === 0 ? 0 : 12);
    const tax = Math.round(postDiscount * TAX_RATE * 100) / 100;
    const total = postDiscount + shipping + tax;

    return { lineItems, subtotal, discount, shipping, tax, total, couponApplied: !!coupon?.active };
  },

  create(args: {
    userId: string;
    items: CartItem[];
    checkout: CheckoutInput;
  }): Order {
    const { lineItems, subtotal, discount, shipping, tax, total } = orderService.computeTotals(
      args.items,
      args.checkout.couponCode
    );

    const now = new Date().toISOString();
    const initial: OrderStatus = "processing";

    const order: Order = {
      id: `ord_${nanoid(10)}`,
      orderNumber: orderRepo.nextOrderNumber(),
      userId: args.userId,
      status: initial,
      items: lineItems,
      subtotal,
      discount,
      shipping,
      tax,
      total,
      currency: "USD",
      shippingAddress: args.checkout.shippingAddress,
      billingAddress: args.checkout.billingAddress ?? args.checkout.shippingAddress,
      paymentMethod: args.checkout.paymentMethod,
      paymentStatus: "paid", // mock gateway
      couponCode: args.checkout.couponCode,
      trackingNumber: undefined,
      shippingCarrier: undefined,
      estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
      timeline: [
        { status: "pending_payment", at: now, note: "Order placed." },
        { status: "processing", at: now, note: "Payment confirmed." },
      ],
      notes: args.checkout.notes,
      createdAt: now,
      updatedAt: now,
    };

    return orderRepo.insert(order);
  },
};
