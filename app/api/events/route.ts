import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { trackUserEvent } from '@/lib/marketing';

const allowedEvents = new Set([
  'visit',
  'product_view',
  'view_item',
  'add_to_cart',
  'initiate_checkout',
  'purchase',
  'cart_abandoned',
  'coupon_applied',
  'coupon_removed',
  'favorite_added',
  'favorite_removed',
  'checkout_started',
  'pix_generated',
  'order_completed',
]);

export async function POST(request: Request) {
  const body = await request.json();
  const { user } = await getAuthenticatedUserFromRequest(request);
  const eventName = String(body.eventName || '');

  if (!allowedEvents.has(eventName)) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
  }

  await trackUserEvent({
    userId: user?.id || null,
    email: user?.email?.trim().toLowerCase() || body.email || null,
    anonymousId: body.anonymousId || null,
    eventName,
    page: body.page || null,
    productId: body.productId || null,
    orderId: body.orderId || null,
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
  });

  return NextResponse.json({ success: true });
}
