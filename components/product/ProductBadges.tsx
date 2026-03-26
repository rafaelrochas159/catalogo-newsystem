"use client";

import { Badge } from '@/components/ui/badge';
import { Produto } from '@/types';

interface ProductBadgesProps {
  product: Produto;
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA';
  className?: string;
}

export function ProductBadges({ product, catalogType, className = '' }: ProductBadgesProps) {
  const badges = [];

  if (product.is_novo) {
    badges.push(
      <Badge key="new" className="bg-green-500 text-white">
        Novo
      </Badge>
    );
  }

  if (product.is_promocao) {
    badges.push(
      <Badge key="promotion" className="bg-red-500 text-white">
        Promoção
      </Badge>
    );
  }

  if (product.is_mais_vendido) {
    badges.push(
      <Badge key="bestseller" className="bg-yellow-500 text-black">
        Mais Vendido
      </Badge>
    );
  }

  if (product.is_destaque) {
    badges.push(
      <Badge key="featured" className="bg-purple-500 text-white">
        Destaque
      </Badge>
    );
  }

  if (catalogType === 'CAIXA_FECHADA') {
    badges.push(
      <Badge key="box" className="bg-blue-500 text-white">
        Caixa Fechada
      </Badge>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges}
    </div>
  );
}
