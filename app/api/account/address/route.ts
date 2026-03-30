import { NextResponse } from 'next/server';
import { upsertPrimaryAddress } from '@/lib/customer-account';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const body = await request.json();
    const data = await upsertPrimaryAddress(user.id, body);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/account/address failed', error);
    return NextResponse.json({ error: 'Nao foi possivel salvar seu endereco.' }, { status: 500 });
  }
}

