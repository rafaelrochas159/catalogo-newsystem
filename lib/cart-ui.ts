export const CART_DRAWER_OPEN_EVENT = 'newsystem:cart-drawer-open';

export interface CartDrawerOpenDetail {
  productName?: string | null;
  source?: 'product-card' | 'product-page' | 'quick-view' | 'unknown';
}

export function openCartDrawer(detail: CartDrawerOpenDetail = {}) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<CartDrawerOpenDetail>(CART_DRAWER_OPEN_EVENT, {
      detail,
    }),
  );
}
