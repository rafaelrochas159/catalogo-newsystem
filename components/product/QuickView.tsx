"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Produto } from '@/types';
import { trackClientEvent } from '@/lib/client-auth';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { ShoppingCart, Minus, Plus, Check } from 'lucide-react';
import { ProductBadges } from './ProductBadges';
import toast from 'react-hot-toast';

interface QuickViewProps {
  product: Produto;
  isOpen: boolean;
  onClose: () => void;
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA';
}

export function QuickView({ product, isOpen, onClose, catalogType }: QuickViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCart((state) => state.addItem);

  const price = catalogType === 'UNITARIO'
    ? (product.preco_promocional_unitario || product.preco_unitario || 0)
    : (product.preco_promocional_caixa || product.preco_caixa || 0);

  const stock = catalogType === 'UNITARIO'
    ? (product.estoque_unitario || 0)
    : (product.estoque_caixa || 0);

  useEffect(() => {
    if (!isOpen) return;

    void trackClientEvent({
      eventName: 'view_item',
      page: `/produto/${product.slug}`,
      productId: product.id,
      metadata: {
        source: 'quick-view',
        catalogType,
        stock,
      },
    });
  }, [catalogType, isOpen, product.id, product.slug, stock]);

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = addItem(product, quantity, catalogType);
    
    if (result.success) {
      setTimeout(() => {
        setIsAdding(false);
        setQuantity(1);
        onClose();
      }, 500);
    } else {
      setIsAdding(false);
      toast.error(result.message || 'Erro ao adicionar ao carrinho');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={product.imagem_principal || '/images/placeholder.jpg'}
                alt={product.nome}
                fill
                className="object-cover"
              />
              <div className="absolute top-2 left-2">
                <ProductBadges product={product} catalogType={catalogType} />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <DialogHeader>
                <p className="text-sm text-muted-foreground uppercase tracking-wide">
                  {product.categoria?.nome}
                </p>
                <DialogTitle className="text-2xl">{product.nome}</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground">
                SKU: {product.sku}
              </p>

              {product.descricao && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {product.descricao}
                </p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-neon-blue">
                  {formatPrice(price)}
                </span>
                {catalogType === 'CAIXA_FECHADA' && product.quantidade_por_caixa && (
                  <span className="text-sm text-muted-foreground">
                    ({product.quantidade_por_caixa} un/caixa)
                  </span>
                )}
              </div>

              {/* Stock */}
              <p className="text-sm">
                <span className="text-muted-foreground">Estoque:</span>{' '}
                <span className={stock > 10 ? 'text-green-500' : stock > 0 ? 'text-yellow-500' : 'text-red-500'}>
                  {stock > 0 ? `${stock} unidades` : 'Indisponível'}
                </span>
              </p>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantidade:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    disabled={quantity >= stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-2 border-t">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold text-neon-blue">
                  {formatPrice(price * quantity)}
                </span>
              </div>

              {/* Add to Cart */}
              <Button
                className="w-full bg-neon-blue hover:bg-neon-blue/90 text-black font-semibold"
                onClick={handleAddToCart}
                disabled={isAdding || stock === 0}
              >
                {isAdding ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Adicionado!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
