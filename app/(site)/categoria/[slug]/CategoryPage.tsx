"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Categoria, Produto } from '@/types';

interface CategoryPageProps {
  category: Categoria;
  products: Produto[];
}

export function CategoryPage({ category, products }: CategoryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter((product) =>
      product.nome.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.descricao?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 border-b border-border/40">
        <div className="container">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{category.nome}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-4xl font-bold mb-4">{category.nome}</h1>
            {category.descricao && (
              <p className="text-muted-foreground">{category.descricao}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border/40">
        <div className="container">
          <div className="flex gap-4">
            <div className="flex-1 max-w-md">
              <Input
                type="search"
                placeholder="Buscar nesta categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12">
        <div className="container">
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado
            {filteredProducts.length !== 1 ? 's' : ''}
          </div>
          
          <ProductGrid
            products={filteredProducts}
            catalogType="UNITARIO"
            emptyMessage={`Nenhum produto encontrado na categoria ${category.nome}.`}
          />
        </div>
      </section>
    </div>
  );
}