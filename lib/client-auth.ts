"use client";

import { supabase } from '@/lib/supabase/client';

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
    await authorizedFetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // evento não deve quebrar a navegação
  }
}
