import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { upsertAbandonedCart } from '@/lib/marketing';
import { createRequiredServerClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const db = createRequiredServerClient() as any;
  const email = user.email?.trim().toLowerCase() || null;
  const query = db
    .from('abandoned_carts')
    .select('*')
    .in('status', ['active', 'abandoned'])
    .order('updated_at', { ascending: false })
    .limit(1);

  const scopedQuery = user.id
    ? query.eq('user_id', user.id)
    : email
      ? query.eq('email', email)
      : null;

  const { data, error } = scopedQuery ? await scopedQuery.maybeSingle() : { data: null, error: null };
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || null });
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json();
  const cart = await upsertAbandonedCart({
    cartId: body.cartId || null,
    userId: user.id,
    email: user.email?.trim().toLowerCase() || body.email || null,
    customerName: body.customerName || null,
    customerPhone: body.customerPhone || null,
    items: Array.isArray(body.items) ? body.items : [],
    cartType: body.cartType || null,
    itemCount: Number(body.itemCount || 0),
    subtotal: Number(body.subtotal || 0),
    total: Number(body.total || 0),
    status: body.status === 'abandoned' ? 'abandoned' : 'active',
  });

  return NextResponse.json({ data: cart });
}

export async function DELETE(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status === 'converted' ? 'converted' : 'recovered';
  const cart = await upsertAbandonedCart({
    cartId: body.cartId || null,
    userId: user.id,
    email: user.email?.trim().toLowerCase() || null,
    customerName: body.customerName || null,
    customerPhone: body.customerPhone || null,
    items: [],
    cartType: null,
    itemCount: 0,
    subtotal: 0,
    total: 0,
    status,
  });

  return NextResponse.json({ data: cart });
}
