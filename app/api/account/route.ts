import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { ensureCustomerProfile, getCustomerAccount } from '@/lib/customer-account';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const ensuredProfile = await ensureCustomerProfile(user as any);
    const data = await getCustomerAccount(user.id, user.email || null);
    const mergedProfile = {
      ...(ensuredProfile || {}),
      ...(data?.profile || {}),
      email:
        data?.profile?.email ||
        ensuredProfile?.email ||
        user.email?.trim().toLowerCase() ||
        null,
      nome:
        data?.profile?.nome ||
        ensuredProfile?.nome ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        null,
      telefone:
        data?.profile?.telefone ||
        ensuredProfile?.telefone ||
        user.user_metadata?.phone ||
        null,
      cpf_cnpj:
        data?.profile?.cpf_cnpj ||
        ensuredProfile?.cpf_cnpj ||
        user.user_metadata?.cpf_cnpj ||
        null,
    };

    debugAccount('account loaded', {
      userId: user.id,
      hasProfile: Boolean(mergedProfile),
      addressCount: Array.isArray(data?.addresses) ? data.addresses.length : 0,
      orderCount: Array.isArray(data?.orders) ? data.orders.length : 0,
      favoriteCount: Array.isArray(data?.favorites) ? data.favorites.length : 0,
    });

    return NextResponse.json({
      data: {
        ...data,
        profile: mergedProfile,
      },
    });
  } catch (error) {
    console.error('GET /api/account failed', error);
    return NextResponse.json(
      { error: 'Nao foi possivel carregar sua conta agora.' },
      { status: 500 }
    );
  }
}
