import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { ensureCustomerProfile, getCustomerAccount } from '@/lib/customer-account';

function debugAccount(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.info(`[account] ${message}`, details);
}

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    await ensureCustomerProfile(user as any);
    const data = await getCustomerAccount(user.id, user.email || null);

    debugAccount('account loaded', {
      userId: user.id,
      hasProfile: Boolean(data?.profile),
      addressCount: Array.isArray(data?.addresses) ? data.addresses.length : 0,
      orderCount: Array.isArray(data?.orders) ? data.orders.length : 0,
      favoriteCount: Array.isArray(data?.favorites) ? data.favorites.length : 0,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/account failed', error);
    return NextResponse.json(
      { error: 'Nao foi possivel carregar sua conta agora.' },
      { status: 500 }
    );
  }
}
