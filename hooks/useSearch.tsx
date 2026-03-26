"use client";

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { Produto } from '@/types';
import { supabase } from '@/lib/supabase/client';

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: Produto[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useSearch(initialQuery: string = '', debounceMs: number = 300): UseSearchReturn {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const debouncedQuery = useDebounce(query, debounceMs);

  const searchProducts = useCallback(async (searchQuery: string, pageNum: number = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*)
        `)
        .or(`nome.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,descricao.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .order('nome')
        .range((pageNum - 1) * 24, pageNum * 24 - 1);

      if (supabaseError) throw supabaseError;

      const products = data as Produto[] || [];
      
      if (pageNum === 1) {
        setResults(products);
      } else {
        setResults(prev => [...prev, ...products]);
      }
      
      setHasMore(products.length === 24);
    } catch (err) {
      setError('Erro ao buscar produtos. Tente novamente.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    searchProducts(debouncedQuery, 1);
  }, [debouncedQuery, searchProducts]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      searchProducts(debouncedQuery, nextPage);
    }
  }, [isLoading, hasMore, page, debouncedQuery, searchProducts]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasMore,
    loadMore,
  };
}
