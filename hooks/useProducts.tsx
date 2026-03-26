"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Produto, FiltrosProduto } from '@/types';

interface UseProductsOptions {
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA';
  categorySlug?: string;
  filters?: FiltrosProduto;
  page?: number;
  perPage?: number;
  featured?: boolean;
  bestseller?: boolean;
  isNew?: boolean;
}

interface UseProductsReturn {
  products: Produto[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => void;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const {
    catalogType,
    categorySlug,
    filters,
    page = 1,
    perPage = 24,
    featured,
    bestseller,
    isNew,
  } = options;

  const [products, setProducts] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*)
        `, { count: 'exact' })
        .eq('is_active', true);

      // Filtro por tipo de catálogo
      if (catalogType) {
        query = query.eq('tipo_catalogo', catalogType);
      }

      // Filtro por categoria
      if (categorySlug) {
        query = query.eq('categoria.slug', categorySlug);
      }

      // Filtros adicionais
      if (featured) {
        query = query.eq('is_destaque', true);
      }

      if (bestseller) {
        query = query.eq('is_mais_vendido', true);
      }

      if (isNew) {
        query = query.eq('is_novo', true);
      }

      if (filters?.precoMin !== undefined) {
        query = query.gte('preco_unitario', filters.precoMin);
      }

      if (filters?.precoMax !== undefined) {
        query = query.lte('preco_unitario', filters.precoMax);
      }

      // Ordenação
      if (bestseller) {
        query = query.order('visualizacoes', { ascending: false });
      } else if (isNew) {
        query = query.order('created_at', { ascending: false });
      } else if (featured) {
        query = query.order('is_destaque', { ascending: false });
      } else {
        query = query.order('nome');
      }

      // Paginação
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error: supabaseError, count } = await query;

      if (supabaseError) throw supabaseError;

      setProducts(data as Produto[] || []);
      setTotal(count || 0);
    } catch (err) {
      setError('Erro ao carregar produtos. Tente novamente.');
      console.error('Products error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [catalogType, categorySlug, filters, page, perPage, featured, bestseller, isNew]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    total,
    hasMore: products.length < total,
    refetch: fetchProducts,
  };
}
