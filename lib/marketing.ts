import { createRequiredServerClient } from '@/lib/supabase/client';

export type EventPayload = {
  userId?: string | null;
  email?: string | null;
  eventName: string;
  page?: string | null;
  productId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackUserEvent(payload: EventPayload) {
  const db = createRequiredServerClient() as any;
  const { error } = await db.from('user_events').insert({
    user_id: payload.userId || null,
    email: payload.email?.trim().toLowerCase() || null,
    event_name: payload.eventName,
    page: payload.page || null,
    product_id: payload.productId || null,
    order_id: payload.orderId || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    throw error;
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
  const email = payload.email?.trim().toLowerCase() || null;
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
