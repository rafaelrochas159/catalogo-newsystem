import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { ensureCustomerProfile, getCustomerAccount } from '@/lib/customer-account';

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    await ensureCustomerProfile(user as any);
    const data = await getCustomerAccount(user.id, user.email || null);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/account failed', error);
    return NextResponse.json(
      { error: 'Nao foi possivel carregar sua conta agora.' },
      { status: 500 }
    );
  }
}

