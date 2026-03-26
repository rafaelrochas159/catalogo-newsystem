"use client";

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Box, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ProductGrid } from '@/components/product/ProductGrid';
import { MinOrderAlert } from '@/components/cart/MinOrderAlert';
import { Produto, Categoria } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';

interface CatalogPageProps {
  title: string;
  description: string;
  products: Produto[];
  categories: Categoria[];
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA';
}

export function CatalogPage({ 
  title, 
  description, 
  products, 
  categories,
  catalogType 
}: CatalogPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const cartSubtotal = useCart((state) => state.getSubtotal());
  const cartDiscount = useCart((state) => state.getDiscount());
  const cartTotal = useCart((state) => state.getTotal());

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          product.nome.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.descricao?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory && product.categoria_id !== selectedCategory) {
        return false;
      }

      // Price filter
      if (priceRange) {
        const price = catalogType === 'UNITARIO' 
          ? (product.preco_promocional_unitario || product.preco_unitario || 0)
          : (product.preco_promocional_caixa || product.preco_caixa || 0);
        
        if (price < priceRange.min || price > priceRange.max) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, priceRange, catalogType]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPriceRange(null);
  };

  const hasFilters = searchQuery || selectedCategory || priceRange;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 border-b border-border/40">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-neon-blue/20 flex items-center justify-center">
                {catalogType === 'UNITARIO' ? (
                  <Package className="h-6 w-6 text-neon-blue" />
                ) : (
                  <Box className="h-6 w-6 text-neon-purple" />
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </motion.div>
        </div>
      </section>

      {/* Cart Summary & Filters */}
      <section className="py-6 border-b border-border/40 sticky top-16 z-30 bg-background/95 backdrop-blur">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Filters Button (Mobile) */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <div className="space-y-6">
                  <h3 className="font-semibold">Filtros</h3>
                  
                  {/* Categories */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Categorias</h4>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(
                            selectedCategory === category.id ? null : category.id
                          )}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedCategory === category.id
                              ? 'bg-neon-blue/10 text-neon-blue'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {category.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-2">
              {categories.slice(0, 5).map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/30'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {category.nome}
                </button>
              ))}
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>

          {/* Min Order Alert (Unitário) */}
          {catalogType === 'UNITARIO' && (
            <div className="mt-4">
              <MinOrderAlert />
            </div>
          )}
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
            catalogType={catalogType}
            emptyMessage="Nenhum produto encontrado com os filtros selecionados."
          />
        </div>
      </section>
    </div>
  );
}
