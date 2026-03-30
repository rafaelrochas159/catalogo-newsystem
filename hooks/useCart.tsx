"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Produto, CartItem } from '@/types';
import { trackClientEvent } from '@/lib/client-auth';
import { BUSINESS_RULES, STORAGE_KEYS } from '@/lib/constants';

interface CartState {
  items: CartItem[];
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA' | null;
}

interface CartActions {
  addItem: (product: Produto, quantity: number, type: 'UNITARIO' | 'CAIXA_FECHADA') => { success: boolean; message?: string };
  removeItem: (productId: string, type: 'UNITARIO' | 'CAIXA_FECHADA') => void;
  updateQuantity: (productId: string, type: 'UNITARIO' | 'CAIXA_FECHADA', quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  canAddType: (type: 'UNITARIO' | 'CAIXA_FECHADA') => { allowed: boolean; message?: string };
  getRemainingForMinOrder: () => number;
  hasMinOrder: () => boolean;
}

const getProductPrice = (product: Produto, type: 'UNITARIO' | 'CAIXA_FECHADA'): number => {
  if (type === 'UNITARIO') {
    return product.preco_promocional_unitario || product.preco_unitario || 0;
  } else {
    return product.preco_promocional_caixa || product.preco_caixa || 0;
  }
};

export const useCart = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],
      catalogType: null,

      canAddType: (type) => {
        const { catalogType, items } = get();
        
        if (items.length === 0) {
          return { allowed: true };
        }
        
        if (catalogType !== type) {
          return {
            allowed: false,
            message: type === 'UNITARIO' 
              ? 'Você já tem produtos de caixa fechada no carrinho. Esvazie o carrinho para adicionar produtos unitários.'
              : 'Você já tem produtos unitários no carrinho. Esvazie o carrinho para adicionar produtos de caixa fechada.'
          };
        }
        
        return { allowed: true };
      },

      addItem: (product, quantity, type) => {
        const { items, catalogType, canAddType } = get();
        const normalizedType = type === 'UNITARIO' ? 'unit' : 'box';
        
        // Verificar se pode adicionar este tipo
        const canAdd = canAddType(type);
        if (!canAdd.allowed) {
          return { success: false, message: canAdd.message };
        }

        // Verificar se o produto suporta este tipo
        if (product.tipo_catalogo !== type && product.tipo_catalogo !== 'AMBOS') {
          return { 
            success: false, 
            message: `Este produto não está disponível no catálogo ${type === 'UNITARIO' ? 'unitário' : 'de caixa fechada'}.`
          };
        }

        // Verificar estoque
        const stock = type === 'UNITARIO' ? product.estoque_unitario : product.estoque_caixa;
        if (stock < quantity) {
          return { 
            success: false, 
            message: `Estoque insuficiente. Disponível: ${stock} unidades.`
          };
        }

        const price = getProductPrice(product, type);
        
        if (price === 0 && type === 'CAIXA_FECHADA') {
          return { 
            success: false, 
            message: 'Este produto não possui preço para caixa fechada.'
          };
        }

        const existingItemIndex = items.findIndex(
          item =>
            item.productId === product.id &&
            (item.catalogType === type || item.type === normalizedType)
        );

        let newItems;
        if (existingItemIndex >= 0) {
          // Atualizar quantidade do item existente
          newItems = [...items];
          const newQuantity = newItems[existingItemIndex].quantity + quantity;
          
          if (stock < newQuantity) {
            return { 
              success: false, 
              message: `Estoque insuficiente. Disponível: ${stock} unidades.`
            };
          }
          
          newItems[existingItemIndex].quantity = newQuantity;
        } else {
          // Adicionar novo item
          newItems = [...items, { 
            id: `${product.id}-${type}`,
            productId: product.id,
            name: product.nome,
            sku: product.sku,
            image: product.imagem_principal,
            price, 
            quantity, 
            type: normalizedType as 'unit' | 'box',
            catalogType: type 
          }];
        }

        set({ 
          items: newItems, 
          catalogType: type 
        });

        void trackClientEvent({
          eventName: 'add_to_cart',
          page: typeof window !== 'undefined' ? window.location.pathname : '/catalogo',
          productId: product.id,
          metadata: {
            quantity,
            price,
            total: price * quantity,
            catalogType: type,
            productIds: newItems.map((item) => item.productId),
          },
        });

        return { success: true };
      },

      removeItem: (productId, type) => {
        const { items } = get();
        const newItems = items.filter(
          item => !(item.productId === productId && item.type === (type === 'UNITARIO' ? 'unit' : 'box'))
        );
        
        set({ 
          items: newItems,
          catalogType: newItems.length === 0 ? null : get().catalogType
        });
      },

      updateQuantity: (productId, type, quantity) => {
        const { items } = get();
        
        if (quantity <= 0) {
          get().removeItem(productId, type);
          return;
        }

        const itemIndex = items.findIndex(
          item => item.productId === productId && item.type === (type === 'UNITARIO' ? 'unit' : 'box')
        );

        if (itemIndex >= 0) {
          const newItems = [...items];
          newItems[itemIndex].quantity = quantity;
          set({ items: newItems });
        }
      },

      clearCart: () => {
        set({ items: [], catalogType: null });
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getDiscount: () => {
        const subtotal = get().getSubtotal();
        const { catalogType } = get();
        
        // Só aplica desconto para pedidos unitários acima do threshold
        if (catalogType === 'UNITARIO' && subtotal >= BUSINESS_RULES.discountThreshold) {
          return subtotal * (BUSINESS_RULES.discountPercentage / 100);
        }
        
        return 0;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        return subtotal - discount;
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },

      getRemainingForMinOrder: () => {
        const { catalogType } = get();
        const subtotal = get().getSubtotal();
        
        if (catalogType !== 'UNITARIO') {
          return 0;
        }
        
        const remaining = BUSINESS_RULES.minOrderValue - subtotal;
        return remaining > 0 ? remaining : 0;
      },

      hasMinOrder: () => {
        const { catalogType } = get();
        const subtotal = get().getSubtotal();
        
        if (catalogType !== 'UNITARIO') {
          return true;
        }
        
        return subtotal >= BUSINESS_RULES.minOrderValue;
      },
    }),
    {
      name: STORAGE_KEYS.cart,
    }
  )
);
