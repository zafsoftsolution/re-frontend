"use client";

import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function QuantitySelector({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99,
  disabled = false,
}: QuantitySelectorProps) {
  const increment = () => {
    if (quantity < max && !disabled) {
      onQuantityChange(quantity + 1);
    }
  };

  const decrement = () => {
    if (quantity > min && !disabled) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={decrement}
        disabled={disabled || quantity <= min}
        className="p-2 border rounded-lg hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Minus size={16} />
      </button>
      <span className="w-12 text-center font-semibold">{quantity}</span>
      <button
        onClick={increment}
        disabled={disabled || quantity >= max}
        className="p-2 border rounded-lg hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
