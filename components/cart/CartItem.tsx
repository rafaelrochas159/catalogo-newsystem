"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CartItem as CartItemType } from '@/types';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { getBoxLabel } from '@/lib/pricing';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA';
}

export function CartItem({ item, catalogType }: CartItemProps) {
  const updateQuantity = useCart((state) => state.updateQuantity);
  const removeItem = useCart((state) => state.removeItem);

  const { productId, name, sku, image, price, quantity, type, boxQuantity } = item;
  const total = price * quantity;
  const boxLabel =
    type === 'box' || type === 'CAIXA_FECHADA'
      ? getBoxLabel({ box_quantity: boxQuantity }, quantity)
      : null;

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId, catalogType);
    } else {
      updateQuantity(productId, catalogType, newQuantity);
    }
  };

  return (
    <div className="flex gap-4 p-3 rounded-lg bg-muted/50">
      {/* Image */}
      <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
        <Image
          src={image || '/images/placeholder.jpg'}
          alt={name}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-2">
          {name}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          SKU: {sku}
        </p>
        <p className="text-xs text-muted-foreground">
          {type === 'unit' || type === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}
        </p>
        {boxLabel && (
          <p className="text-xs text-muted-foreground">
            {boxLabel}
          </p>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleUpdateQuantity(quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleUpdateQuantity(quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <span className="font-medium text-neon-blue">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => removeItem(productId, catalogType)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
