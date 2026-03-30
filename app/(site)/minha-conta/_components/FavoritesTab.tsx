'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/button';

export function FavoritesTab({ favorites }: { favorites: any[] }) {
  const products = favorites
    .map((favorite) => favorite.produto)
    .filter(Boolean);

  if (products.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center">
        <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h3 className="mb-2 font-semibold">Nenhum favorito salvo</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Salve produtos para comparar depois e manter uma base limpa para remarketing futuro.
        </p>
        <Link href="/catalogo/unitario">
          <Button className="bg-neon-blue text-black hover:bg-neon-blue/90">
            Explorar produtos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product: any) => (
        <ProductCard
          key={product.id}
          product={product}
          catalogType={product.tipo_catalogo === 'CAIXA_FECHADA' ? 'CAIXA_FECHADA' : 'UNITARIO'}
        />
      ))}
    </div>
  );
}
