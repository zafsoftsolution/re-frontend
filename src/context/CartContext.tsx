"use client";

import { nanoid } from "nanoid";
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { CartItem, Product, SizeLabel } from "@/types";

const STORAGE_KEY = "jmn:cart:v1";
const COUPON_KEY = "jmn:coupon:v1";
const FREE_SHIPPING_THRESHOLD = 150;
const TAX_RATE = 0.08;

interface AddArgs {
  product: Product;
  size: SizeLabel;
  color: string;
  quantity?: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addToCart: (args: AddArgs) => void;
  removeFromCart: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  // Coupon
  couponCode: string | null;
  setCoupon: (code: string | null) => void;
  // Totals (client-side estimate; server authoritative via /api/cart/totals)
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  count: number;
  freeShippingRemaining: number;
  freeShippingThreshold: number;
  hasFreeShipping: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const coupon = localStorage.getItem(COUPON_KEY);
      if (coupon) setCouponCode(coupon);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (couponCode) localStorage.setItem(COUPON_KEY, couponCode);
    else localStorage.removeItem(COUPON_KEY);
  }, [couponCode, hydrated]);

  const addToCart = ({ product, size, color, quantity = 1 }: AddArgs) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.selectedSize === size && i.selectedColor === color
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      const line: CartItem = {
        id: nanoid(10),
        productId: product.id,
        product,
        quantity,
        selectedSize: size,
        selectedColor: color,
        addedAt: new Date().toISOString(),
      };
      return [...prev, line];
    });
    setIsOpen(true);
  };

  const removeFromCart = (lineId: string) =>
    setItems((prev) => prev.filter((i) => i.id !== lineId));

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(lineId);
    setItems((prev) => prev.map((i) => (i.id === lineId ? { ...i, quantity } : i)));
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode(null);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 12;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    return {
      subtotal,
      shipping,
      tax,
      total: subtotal + shipping + tax,
      count: items.reduce((c, i) => c + i.quantity, 0),
      freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      hasFreeShipping: subtotal >= FREE_SHIPPING_THRESHOLD,
    };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        couponCode,
        setCoupon: setCouponCode,
        ...totals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
