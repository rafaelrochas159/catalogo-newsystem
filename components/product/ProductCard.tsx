"use client";

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Check, ShieldCheck, Truck, PackageCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Produto } from '@/types';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { formatPrice, getBoxSavings, getBoxUnitPrice } from '@/lib/utils';
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
  const stock = catalogType === 'UNITARIO' ? product.estoque_unitario : product.estoque_caixa;
  const boxPricing = getBoxSavings(product);
  const unitPriceInBox = getBoxUnitPrice(product);

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = addItem(product, 1, catalogType);

    if (result.success) {
      setTimeout(() => setIsAdding(false), 1000);
      return;
    }

    setIsAdding(false);
    toast.error(result.message || 'Erro ao adicionar ao carrinho');
  };

  const getBadges = () => {
    const badges = [];

    if (product.is_novo) badges.push({ ...PRODUCT_BADGES.NEW, key: 'new' });
    if (product.is_promocao && hasDiscount) badges.push({ ...PRODUCT_BADGES.PROMOTION, key: 'promotion' });
    if (product.is_mais_vendido) badges.push({ ...PRODUCT_BADGES.BESTSELLER, key: 'bestseller' });
    if (product.is_destaque) badges.push({ ...PRODUCT_BADGES.FEATURED, key: 'featured' });
    if (catalogType === 'CAIXA_FECHADA') badges.push({ ...PRODUCT_BADGES.BOX, key: 'box' });

    return badges;
  };

  return (
    <motion.div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
    >
      <div className={`relative overflow-hidden rounded-[24px] border bg-card transition-all duration-300 ${
        isHovered ? 'border-neon-blue/40 shadow-[0_22px_60px_rgba(0,243,255,0.12)]' : 'border-border'
      }`}>
        <div className="relative aspect-square cursor-pointer overflow-hidden bg-muted" onClick={() => setIsQuickViewOpen(true)}>
          <Image
            src={product.imagem_principal || '/images/placeholder.jpg'}
            alt={product.nome}
            fill
            className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />

          <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-2">
            {getBadges().slice(0, 2).map((badge) => (
              <Badge key={badge.key} className={`${badge.color} border-0 text-white shadow-sm`}>
                {badge.label}
              </Badge>
            ))}
            {hasDiscount && (
              <Badge className="border-0 bg-emerald-500 text-white shadow-sm">
                Economize {formatPrice(originalPrice - price)}
              </Badge>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(product.id, 'product-card');
            }}
            className={`absolute right-3 top-3 rounded-full bg-background/85 p-2 backdrop-blur-sm transition-all hover:bg-background ${
              isFavorite(product.id) ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
          </button>

          <motion.div
            className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45"
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

          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/45 p-3 text-white backdrop-blur">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-[0.18em] text-neon-blue">
                {catalogType === 'CAIXA_FECHADA' ? 'Compra em caixa' : 'Compra unitaria'}
              </span>
              <span>{stock > 0 ? (stock <= 5 ? `Ultimas ${stock}` : 'Estoque disponivel') : 'Sem estoque'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {product.categoria?.nome || 'Sem categoria'}
            </p>
            <h3 className="min-h-[3rem] text-base font-semibold leading-6">{product.nome}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>SKU: {product.sku}</span>
              <span className="text-border">•</span>
              <span>{product.tipo_catalogo === 'AMBOS' ? 'Unitario e caixa' : product.tipo_catalogo === 'CAIXA_FECHADA' ? 'Caixa fechada' : 'Unitario'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neon-blue/15 bg-gradient-to-r from-neon-blue/8 to-transparent p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Preco em destaque</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-3xl font-bold text-neon-blue">{formatPrice(price)}</span>
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                  )}
                </div>
              </div>
              {catalogType === 'CAIXA_FECHADA' && product.quantidade_por_caixa ? (
                <div className="rounded-xl bg-background/80 px-3 py-2 text-right text-xs">
                  <p className="font-semibold">{product.quantidade_por_caixa} un</p>
                  <p className="text-muted-foreground">por caixa</p>
                </div>
              ) : null}
            </div>

            {catalogType === 'CAIXA_FECHADA' && unitPriceInBox && (
              <p className="mt-3 text-sm text-emerald-500">Cada unidade na caixa sai por {formatPrice(unitPriceInBox)}.</p>
            )}

            {catalogType === 'UNITARIO' && boxPricing.savingsPerUnit > 0 && (
              <p className="mt-3 text-sm text-emerald-500">
                Leve na caixa e economize {formatPrice(boxPricing.savingsPerUnit)} por unidade.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            {(product.is_mais_vendido || product.is_promocao) && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-amber-500">
                <PackageCheck className="h-3 w-3" />
                {product.is_mais_vendido ? 'Mais vendido' : 'Oferta real'}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-green-500">
              <Truck className="h-3 w-3" />
              Envio rapido
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-neon-blue">
              <ShieldCheck className="h-3 w-3" />
              Compra segura
            </span>
          </div>

          <Button
            className={`w-full rounded-xl text-black ${isAdding ? 'bg-green-500 hover:bg-green-500' : 'bg-neon-blue hover:bg-neon-blue/90'}`}
            onClick={handleAddToCart}
            disabled={isAdding || stock === 0}
          >
            {isAdding ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Adicionado
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {catalogType === 'CAIXA_FECHADA' ? 'Comprar caixa agora' : 'Comprar agora'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <QuickView
        product={product}
        catalogType={catalogType}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </motion.div>
  );
}


