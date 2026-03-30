import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/server';
import { createRequiredServerClient } from '@/lib/supabase/client';

function normalizeCouponPayload(body: any) {
  return {
    code: String(body.code || '').trim().toUpperCase(),
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim() || null,
    type: String(body.type || 'GLOBAL'),
    discount_type: String(body.discount_type || 'PERCENTAGE'),
    discount_value: Number(body.discount_value || 0),
    minimum_order_value: Number(body.minimum_order_value || 0),
    max_discount_value: body.max_discount_value ? Number(body.max_discount_value) : null,
    usage_limit: body.usage_limit ? Number(body.usage_limit) : null,
    per_user_limit: body.per_user_limit ? Number(body.per_user_limit) : 1,
    product_ids: Array.isArray(body.product_ids) ? body.product_ids.filter(Boolean) : [],
    valid_from: body.valid_from || null,
    valid_until: body.valid_until || null,
    is_active: body.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  }

  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  }

  const body = await request.json();
  const payload = normalizeCouponPayload(body);
  if (!payload.code || !payload.name || payload.discount_value <= 0) {
    return NextResponse.json({ error: 'Código, nome e desconto são obrigatórios.' }, { status: 400 });
  }

  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('coupons')
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  }

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: 'Cupom não informado.' }, { status: 400 });
  }

  const db = createRequiredServerClient() as any;
  const payload = normalizeCouponPayload(body);
  const { data, error } = await db
    .from('coupons')
    .update(payload)
    .eq('id', body.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Cupom não informado.' }, { status: 400 });
  }

  const db = createRequiredServerClient() as any;
  const { error } = await db
    .from('coupons')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
