"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Product } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*)
        `)
        .or(`nome.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,descricao.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .order('nome');

      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    searchProducts(debouncedQuery);
  }, [debouncedQuery, searchProducts]);

  return (
    <div className="min-h-screen">
      <section className="py-12 border-b border-border/40">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-neon-blue/20 flex items-center justify-center">
                <Search className="h-6 w-6 text-neon-blue" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Buscar Produtos</h1>
            <p className="text-muted-foreground">
              Busque por nome, SKU ou descrição
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-6 border-b border-border/40">
        <div className="container">
          <div className="flex gap-4 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Digite sua busca..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            {query && (
              <Button variant="ghost" onClick={() => setQuery('')}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          {query && (
            <div className="mb-4 text-sm text-muted-foreground">
              {isLoading ? (
                'Buscando...'
              ) : (
                <>
                  {products.length} resultado{products.length !== 1 ? 's' : ''} para &quot;{query}&quot;
                </>
              )}
            </div>
          )}
          
          <ProductGrid
            products={products}
            catalogType="UNITARIO"
            isLoading={isLoading}
            emptyMessage={query ? `Nenhum produto encontrado para "${query}".` : 'Digite algo para buscar.'}
          />
        </div>
      </section>
    </div>
  );
}
