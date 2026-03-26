"use client";

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Produto } from '@/types';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { formatPrice } from '@/lib/utils';
import { PRODUCT_BADGES } from '@/lib/constants';
import { QuickView } from './QuickView';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Produto;
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA';
  showQuickView?: boolean;
}

export function ProductCard({ product, catalogType, showQuickView = true }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const addItem = useCart((state) => state.addItem);
  const { isFavorite, toggleFavorite } = useFavorites();

  const price = catalogType === 'UNITARIO' 
    ? (product.preco_promocional_unitario || product.preco_unitario || 0)
    : (product.preco_promocional_caixa || product.preco_caixa || 0);

  const originalPrice = catalogType === 'UNITARIO'
    ? (product.preco_unitario || 0)
    : (product.preco_caixa || 0);

  const hasDiscount = price < originalPrice;

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = addItem(product, 1, catalogType);
    
    if (result.success) {
      // Show success feedback
      setTimeout(() => setIsAdding(false), 1000);
    } else {
      setIsAdding(false);
      // Show error toast
      toast.error(result.message || 'Erro ao adicionar ao carrinho');
    }
  };

  const getBadges = () => {
    const badges = [];
    
    if (product.is_novo) {
      badges.push({ ...PRODUCT_BADGES.NEW, key: 'new' });
    }
    if (product.is_promocao && hasDiscount) {
      badges.push({ ...PRODUCT_BADGES.PROMOTION, key: 'promotion' });
    }
    if (product.is_mais_vendido) {
      badges.push({ ...PRODUCT_BADGES.BESTSELLER, key: 'bestseller' });
    }
    if (product.is_destaque) {
      badges.push({ ...PRODUCT_BADGES.FEATURED, key: 'featured' });
    }
    if (catalogType === 'CAIXA_FECHADA') {
      badges.push({ ...PRODUCT_BADGES.BOX, key: 'box' });
    }
    
    return badges;
  };

  return (
    <motion.div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`
        relative overflow-hidden rounded-xl border bg-card transition-all duration-300
        ${isHovered ? 'border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.2)]' : 'border-border'}
      `}>
        {/* Image Container - Click to open QuickView */}
        <div 
          className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
          onClick={() => setIsQuickViewOpen(true)}
        >
          <Image
            src={product.imagem_principal || '/images/placeholder.jpg'}
            alt={product.nome}
            fill
            className={`
              object-cover transition-transform duration-500
              ${isHovered ? 'scale-110' : 'scale-100'}
            `}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {getBadges().map((badge) => (
                <Badge
                  key={badge.key}
                  className={`${badge.color} text-white text-xs`}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>

            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleFavorite(product.id);
              }}
              className={`
                absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm
                transition-all duration-300 hover:bg-background
                ${isFavorite(product.id) ? 'text-red-500' : 'text-muted-foreground'}
              `}
            >
              <Heart className={`h-4 w-4 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
            </button>

            {/* Quick Actions Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {showQuickView && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsQuickViewOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            {/* Category */}
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {product.categoria?.nome || 'Sem categoria'}
            </p>

            {/* Name */}
            <h3 className="font-medium line-clamp-2 min-h-[2.5rem]">
              {product.nome}
            </h3>

            {/* SKU & Catalog Type */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>SKU: {product.sku}</span>
              <span className="text-border">|</span>
              <Badge 
                variant="outline" 
                className={
                  product.tipo_catalogo === 'UNITARIO' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-purple-500 text-purple-500'
                }
              >
                {product.tipo_catalogo === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}
              </Badge>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-neon-blue">
                {formatPrice(price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>

            {/* Box Info */}
            {catalogType === 'CAIXA_FECHADA' && product.quantidade_por_caixa && (
              <p className="text-xs text-muted-foreground">
                {product.quantidade_por_caixa} unidades por caixa
              </p>
            )}
          </div>
        </div>

      {/* Add to Cart Button */}
      <motion.div
        className="absolute bottom-4 right-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          size="icon"
          className={`
            rounded-full shadow-lg transition-all duration-300
            ${isAdding ? 'bg-green-500' : 'bg-neon-blue hover:bg-neon-blue/90'}
          `}
          onClick={handleAddToCart}
          disabled={isAdding}
        >
          {isAdding ? (
            <Check className="h-4 w-4 text-black" />
          ) : (
            <ShoppingCart className="h-4 w-4 text-black" />
          )}
        </Button>
      </motion.div>

      {/* Quick View Dialog */}
      <QuickView
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        catalogType={catalogType}
      />
    </motion.div>
  );
}
