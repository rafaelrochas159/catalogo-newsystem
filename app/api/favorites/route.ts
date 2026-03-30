import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { addFavoriteProduct, getFavoriteProducts, removeFavoriteProduct } from '@/lib/favorites';
import { trackUserEvent } from '@/lib/marketing';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const data = await getFavoriteProducts(user.id);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json();
  if (!body.productId) {
    return NextResponse.json({ error: 'Produto não informado.' }, { status: 400 });
  }

  const data = await addFavoriteProduct(user.id, String(body.productId));
  if (body.source !== 'sync') {
    await trackUserEvent({
      userId: user.id,
      email: user.email?.trim().toLowerCase() || null,
      eventName: 'favorite_added',
      productId: String(body.productId),
      metadata: {
        source: body.source || 'site',
      },
    });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json();
  if (!body.productId) {
    return NextResponse.json({ error: 'Produto não informado.' }, { status: 400 });
  }

  await removeFavoriteProduct(user.id, String(body.productId));
  if (body.source !== 'sync') {
    await trackUserEvent({
      userId: user.id,
      email: user.email?.trim().toLowerCase() || null,
      eventName: 'favorite_removed',
      productId: String(body.productId),
      metadata: {
        source: body.source || 'site',
      },
    });
  }

  return NextResponse.json({ success: true });
}
