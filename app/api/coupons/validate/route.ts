import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { validateCoupon } from '@/lib/coupons';

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Faça login para aplicar cupons.' }, { status: 401 });
  }

  const body = await request.json();
  const result = await validateCoupon({
    code: String(body.code || ''),
    userId: user.id,
    email: user.email?.trim().toLowerCase() || null,
    items: Array.isArray(body.items) ? body.items : [],
    subtotal: Number(body.subtotal || 0),
    total: Number(body.total || 0),
    abandonedCartId: body.abandonedCartId || null,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ data: result });
}
