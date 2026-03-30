"use client";

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import { authorizedFetch, getBrowserSessionUser } from '@/lib/client-auth';

interface FavoritesState {
  favorites: string[];
  initialized: boolean;
}

interface FavoritesActions {
  hydrateFromServer: () => Promise<void>;
  addFavorite: (productId: string, source?: string) => Promise<void>;
  removeFavorite: (productId: string, source?: string) => Promise<void>;
  toggleFavorite: (productId: string, source?: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState & FavoritesActions>()(
  persist(
    (set, get) => ({
      favorites: [],
      initialized: false,

      hydrateFromServer: async () => {
        const user = await getBrowserSessionUser();
        if (!user) {
          set({ initialized: true });
          return;
        }

        try {
          const response = await authorizedFetch('/api/favorites', { cache: 'no-store' });
          if (!response.ok) {
            set({ initialized: true });
            return;
          }

          const json = await response.json();
          const serverFavorites = Array.isArray(json.data)
            ? json.data.map((favorite: any) => favorite.product_id).filter(Boolean)
            : [];

          const merged = Array.from(new Set([...get().favorites, ...serverFavorites]));
          set({ favorites: merged, initialized: true });

          for (const productId of merged) {
            await authorizedFetch('/api/favorites', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ productId, source: 'sync' }),
            });
          }
        } catch {
          set({ initialized: true });
        }
      },

      addFavorite: async (productId, source = 'site') => {
        const { favorites } = get();
        if (!favorites.includes(productId)) {
          set({ favorites: [...favorites, productId] });
        }

        const user = await getBrowserSessionUser();
        if (!user) return;

        await authorizedFetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, source }),
        });
      },

      removeFavorite: async (productId, source = 'site') => {
        const { favorites } = get();
        set({ favorites: favorites.filter((id) => id !== productId) });

        const user = await getBrowserSessionUser();
        if (!user) return;

        await authorizedFetch('/api/favorites', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, source }),
        });
      },

      toggleFavorite: async (productId, source = 'site') => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.includes(productId)) {
          await removeFavorite(productId, source);
        } else {
          await addFavorite(productId, source);
        }
      },

      isFavorite: (productId) => {
        return get().favorites.includes(productId);
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: STORAGE_KEYS.favorites,
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);

export function useFavorites() {
  const state = useFavoritesStore();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    state.hydrateFromServer();
  }, [state]);

  return state;
}
