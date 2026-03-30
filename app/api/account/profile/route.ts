import { NextResponse } from 'next/server';
import { ensureCustomerProfile, upsertCustomerProfile } from '@/lib/customer-account';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const profile = await ensureCustomerProfile(user as any);
    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('GET /api/account/profile failed', error);
    return NextResponse.json({ error: 'Nao foi possivel carregar seus dados.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });

    const body = await request.json();
    const data = await upsertCustomerProfile(user.id, {
      ...body,
      email: user.email?.trim().toLowerCase() || body.email,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/account/profile failed', error);
    return NextResponse.json({ error: 'Nao foi possivel salvar seus dados.' }, { status: 500 });
  }
}

