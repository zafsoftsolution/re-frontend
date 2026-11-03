"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Product } from "@/types";

const STORAGE_KEY = "jmn:wishlist:v1";

interface WishlistContextType {
  items: Product[];
  addToWishlist: (p: Product) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (p: Product) => void;
  isInWishlist: (productId: string) => boolean;
  count: number;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const isInWishlist = (id: string) => items.some((p) => p.id === id);

  const addToWishlist = (p: Product) =>
    setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));

  const removeFromWishlist = (id: string) =>
    setItems((prev) => prev.filter((p) => p.id !== id));

  const toggleWishlist = (p: Product) =>
    isInWishlist(p.id) ? removeFromWishlist(p.id) : addToWishlist(p);

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        count: items.length,
        clear: () => setItems([]),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
