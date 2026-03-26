"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';

interface FavoritesState {
  favorites: string[];
}

interface FavoritesActions {
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavorites = create<FavoritesState & FavoritesActions>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (productId) => {
        const { favorites } = get();
        if (!favorites.includes(productId)) {
          set({ favorites: [...favorites, productId] });
        }
      },

      removeFavorite: (productId) => {
        const { favorites } = get();
        set({ favorites: favorites.filter(id => id !== productId) });
      },

      toggleFavorite: (productId) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.includes(productId)) {
          removeFavorite(productId);
        } else {
          addFavorite(productId);
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
    }
  )
);