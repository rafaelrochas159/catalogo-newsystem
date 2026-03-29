"use client";

import { motion } from 'framer-motion';
import { ProductCard } from './ProductCard';
import { Produto } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductGridProps {
  products: Produto[];
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA';
  isLoading?: boolean;
  emptyMessage?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export function ProductGrid({ 
  products, 
  catalogType, 
  isLoading = false,
  emptyMessage = 'Nenhum produto encontrado.'
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-4">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-4xl">📦</span>
        </div>
        <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-2">
          Tente ajustar os filtros ou busque por outros termos.
        </p>
        <p className="text-sm text-yellow-500 max-w-md">
          💡 <strong>Dica:</strong> Este catálogo mostra apenas produtos do tipo "
          <strong>{catalogType === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}</strong>".
          Cadastre produtos no admin com o tipo correto.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <ProductCard product={product} catalogType={catalogType} />
        </motion.div>
      ))}
    </motion.div>
  );
}
