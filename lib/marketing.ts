import crypto from 'crypto';
import { createRequiredServerClient } from '@/lib/supabase/client';

export type EventPayload = {
  userId?: string | null;
  email?: string | null;
  anonymousId?: string | null;
  eventName: string;
  page?: string | null;
  productId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
};

type FunnelStage =
  | 'VISIT'
  | 'PRODUCT_VIEW'
  | 'ADD_TO_CART'
  | 'CHECKOUT'
  | 'PAYMENT'
  | 'POST_PURCHASE'
  | 'REPEAT_PURCHASE';

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function normalizePhone(phone?: string | null) {
  return phone?.replace(/\D/g, '') || null;
}

function sha256(value?: string | null) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function getStandardEvent(eventName: string) {
  const map: Record<string, string | null> = {
    visit: 'page_view',
    product_view: 'view_item',
    view_item: 'view_item',
    add_to_cart: 'add_to_cart',
    initiate_checkout: 'begin_checkout',
    checkout_started: 'begin_checkout',
    pix_generated: 'add_payment_info',
    order_completed: 'purchase',
    purchase: 'purchase',
    cart_abandoned: null,
    coupon_applied: null,
    coupon_removed: null,
    favorite_added: null,
    favorite_removed: null,
  };

  return map[eventName] ?? null;
}

function getFunnelStage(eventName: string): FunnelStage {
  const map: Record<string, FunnelStage> = {
    visit: 'VISIT',
    product_view: 'PRODUCT_VIEW',
    view_item: 'PRODUCT_VIEW',
    add_to_cart: 'ADD_TO_CART',
    initiate_checkout: 'CHECKOUT',
    checkout_started: 'CHECKOUT',
    pix_generated: 'PAYMENT',
    order_completed: 'POST_PURCHASE',
    purchase: 'POST_PURCHASE',
    cart_abandoned: 'ADD_TO_CART',
    coupon_applied: 'CHECKOUT',
    coupon_removed: 'CHECKOUT',
    favorite_added: 'PRODUCT_VIEW',
    favorite_removed: 'PRODUCT_VIEW',
  };

  return map[eventName] || 'VISIT';
}

async function updateFunnelProgress(db: any, payload: EventPayload, funnelStage: FunnelStage) {
  const email = normalizeEmail(payload.email);
  const timestamp = new Date().toISOString();
  const baseRecord = {
    user_id: payload.userId || null,
    email,
    anonymous_id: payload.anonymousId || null,
    current_stage: funnelStage,
    last_event_name: payload.eventName,
    last_seen_at: timestamp,
    metadata: payload.metadata || {},
  };

  const baseQuery = db
    .from('user_funnel_progress')
    .select('id')
    .limit(1);

  const scopedQuery = payload.userId
    ? baseQuery.eq('user_id', payload.userId)
    : email
      ? baseQuery.eq('email', email)
      : payload.anonymousId
        ? baseQuery.eq('anonymous_id', payload.anonymousId)
        : null;

  const existing = scopedQuery ? await scopedQuery.maybeSingle() : { data: null };

  if (existing.data?.id) {
    await db
      .from('user_funnel_progress')
      .update(baseRecord)
      .eq('id', existing.data.id);
    return;
  }

  await db.from('user_funnel_progress').insert({
    ...baseRecord,
    first_seen_at: timestamp,
  });
}

async function sendToMetaConversionsApi(payload: EventPayload, standardEvent: string | null) {
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;
  if (!accessToken || !pixelId || !standardEvent) return;

  const metadata = payload.metadata || {};
  await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v20.0'}/${pixelId}/events?access_token=${accessToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        {
          event_name: standardEvent,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: payload.page || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || undefined,
          event_id: payload.orderId || payload.productId || payload.eventName,
          user_data: {
            em: sha256(payload.email),
            ph: sha256(normalizePhone(String(metadata.phone || ''))),
            external_id: payload.userId ? sha256(payload.userId) : null,
            client_user_agent: typeof metadata.userAgent === 'string' ? metadata.userAgent : null,
          },
          custom_data: {
            currency: 'BRL',
            value: Number(metadata.total || metadata.value || 0),
            content_ids: Array.isArray(metadata.productIds)
              ? metadata.productIds
              : payload.productId
                ? [payload.productId]
                : [],
            content_type: 'product',
            order_id: payload.orderId || metadata.numeroPedido || null,
          },
        },
      ],
    }),
  }).catch(() => undefined);
}

async function sendToGoogleAnalytics(payload: EventPayload, standardEvent: string | null) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret || !standardEvent) return;

  const metadata = payload.metadata || {};
  const clientId = String(metadata.anonymousId || payload.anonymousId || payload.userId || crypto.randomUUID());

  await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      user_id: payload.userId || undefined,
      events: [
        {
          name: standardEvent,
          params: {
            currency: 'BRL',
            value: Number(metadata.total || metadata.value || 0),
            page_location: payload.page || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || undefined,
            transaction_id: payload.orderId || metadata.numeroPedido || undefined,
            items: payload.productId
              ? [{
                  item_id: payload.productId,
                  quantity: Number(metadata.quantity || 1),
                  price: Number(metadata.price || 0),
                }]
              : undefined,
          },
        },
      ],
    }),
  }).catch(() => undefined);
}

export async function trackUserEvent(payload: EventPayload) {
  const db = createRequiredServerClient() as any;
  const email = normalizeEmail(payload.email);
  const metadata = payload.metadata || {};
  const standardEvent = getStandardEvent(payload.eventName);
  const funnelStage = getFunnelStage(payload.eventName);

  const results = await Promise.allSettled([
    db.from('user_events').insert({
      user_id: payload.userId || null,
      email,
      event_name: payload.eventName,
      page: payload.page || null,
      product_id: payload.productId || null,
      order_id: payload.orderId || null,
      metadata,
    }),
    db.from('marketing_events').insert({
      user_id: payload.userId || null,
      email,
      anonymous_id: payload.anonymousId || null,
      event_name: payload.eventName,
      standard_event: standardEvent,
      funnel_stage: funnelStage,
      page: payload.page || null,
      product_id: payload.productId || null,
      order_id: payload.orderId || null,
      metadata,
    }),
    updateFunnelProgress(db, payload, funnelStage),
    sendToMetaConversionsApi(payload, standardEvent),
    sendToGoogleAnalytics(payload, standardEvent),
  ]);

  const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
  if (rejected) {
    throw rejected.reason;
  }
}

export async function upsertAbandonedCart(payload: {
  cartId?: string | null;
  userId?: string | null;
  email?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: unknown[];
  cartType?: string | null;
  itemCount: number;
  subtotal: number;
  total: number;
  status: 'active' | 'abandoned' | 'recovered' | 'converted';
}) {
  const db = createRequiredServerClient() as any;
  const timestamp = new Date().toISOString();
  const email = normalizeEmail(payload.email);
  const baseRecord = {
    user_id: payload.userId || null,
    email,
    customer_name: payload.customerName || null,
    customer_phone: payload.customerPhone || null,
    cart_items: payload.items || [],
    cart_type: payload.cartType || null,
    item_count: Number(payload.itemCount || 0),
    subtotal: Number(payload.subtotal || 0),
    total: Number(payload.total || 0),
    status: payload.status,
    last_activity_at: timestamp,
    updated_at: timestamp,
    abandoned_at: payload.status === 'abandoned' ? timestamp : null,
    recovered_at: payload.status === 'recovered' ? timestamp : null,
    converted_at: payload.status === 'converted' ? timestamp : null,
    whatsapp_payload: email
      ? {
          email,
          item_count: Number(payload.itemCount || 0),
          total: Number(payload.total || 0),
          phone: normalizePhone(payload.customerPhone),
        }
      : null,
    email_payload: email
      ? {
          email,
          item_count: Number(payload.itemCount || 0),
          total: Number(payload.total || 0),
        }
      : null,
  };

  if (payload.cartId) {
    const { data, error } = await db
      .from('abandoned_carts')
      .update(baseRecord)
      .eq('id', payload.cartId)
      .select('*')
      .single();

    if (!error && data) return data;
  }

  const existingQuery = db
    .from('abandoned_carts')
    .select('id')
    .in('status', ['active', 'abandoned'])
    .order('updated_at', { ascending: false })
    .limit(1);

  const scopedExistingQuery = payload.userId
    ? existingQuery.eq('user_id', payload.userId)
    : email
      ? existingQuery.eq('email', email)
      : null;

  const existing = scopedExistingQuery ? await scopedExistingQuery.maybeSingle() : { data: null };

  if (existing.data?.id) {
    const { data, error } = await db
      .from('abandoned_carts')
      .update(baseRecord)
      .eq('id', existing.data.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await db
    .from('abandoned_carts')
    .insert({
      ...baseRecord,
      created_at: timestamp,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
