"use client";

import { supabase } from '@/lib/supabase/client';

const ANONYMOUS_ID_STORAGE_KEY = 'ns_anonymous_id';
const EXPERIMENT_ASSIGNMENTS_STORAGE_KEY = 'ns_experiment_assignments';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
  }
}

export async function getBrowserAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export async function getBrowserSessionUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user || null;
}

export function getAnonymousVisitorId() {
  if (typeof window === 'undefined') return 'server';

  try {
    const existing = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
    if (existing) return existing;

    const nextId = window.crypto?.randomUUID?.() || `anon-${Date.now()}`;
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return `anon-${Date.now()}`;
  }
}

export function getStoredExperimentAssignments() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(EXPERIMENT_ASSIGNMENTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function storeExperimentAssignments(assignments: Record<string, string>) {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredExperimentAssignments();
    window.localStorage.setItem(
      EXPERIMENT_ASSIGNMENTS_STORAGE_KEY,
      JSON.stringify({
        ...current,
        ...assignments,
      }),
    );
  } catch {
    // nÃ£o bloquear a navegaÃ§Ã£o
  }
}

function getStandardEventName(eventName: string) {
  const eventMap: Record<string, string> = {
    visit: 'page_view',
    product_view: 'view_item',
    view_item: 'view_item',
    add_to_cart: 'add_to_cart',
    initiate_checkout: 'begin_checkout',
    checkout_started: 'begin_checkout',
    pix_generated: 'add_payment_info',
    order_completed: 'purchase',
    purchase: 'purchase',
  };

  return eventMap[eventName] || eventName;
}

function getMetaPixelEventName(eventName: string) {
  const eventMap: Record<string, string> = {
    visit: 'PageView',
    product_view: 'ViewContent',
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    initiate_checkout: 'InitiateCheckout',
    checkout_started: 'InitiateCheckout',
    pix_generated: 'AddPaymentInfo',
    order_completed: 'Purchase',
    purchase: 'Purchase',
  };

  return eventMap[eventName] || '';
}

function emitTrackingFallback(payload: {
  eventName: string;
  page?: string;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;

  const standardEvent = getStandardEventName(payload.eventName);
  const metaPixelEvent = getMetaPixelEventName(payload.eventName);
  const metadata = payload.metadata || {};

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: standardEvent,
    ecommerce: {
      currency: 'BRL',
      value: Number(metadata.total || metadata.value || 0),
      items: payload.productId
        ? [
            {
              item_id: payload.productId,
              quantity: Number(metadata.quantity || 1),
              price: Number(metadata.price || 0),
            },
          ]
        : Array.isArray(metadata.productIds)
          ? (metadata.productIds as string[]).map((productId) => ({ item_id: productId }))
          : undefined,
      transaction_id: payload.orderId || metadata.numeroPedido || undefined,
    },
    page: payload.page || window.location.pathname,
  });

  if (metaPixelEvent && typeof window.fbq === 'function') {
    window.fbq('track', metaPixelEvent, {
      currency: 'BRL',
      value: Number(metadata.total || metadata.value || 0),
      content_ids: Array.isArray(metadata.productIds)
        ? metadata.productIds
        : payload.productId
          ? [payload.productId]
          : undefined,
      content_type: 'product',
    });
  }
}

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const accessToken = await getBrowserAccessToken();
  const headers = new Headers(init.headers || {});

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function trackClientEvent(payload: {
  eventName: string;
  page?: string;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
  email?: string | null;
}) {
  try {
    const anonymousId = getAnonymousVisitorId();
    const metadata = {
      ...(payload.metadata || {}),
      anonymousId,
      experiments: getStoredExperimentAssignments(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    emitTrackingFallback({
      ...payload,
      metadata,
    });

    await authorizedFetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        anonymousId,
        metadata,
      }),
    });
  } catch {
    // evento não deve quebrar a navegação
  }
}
