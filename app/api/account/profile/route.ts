import { NextResponse } from 'next/server';
import { ensureCustomerProfile, upsertCustomerProfile } from '@/lib/customer-account';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const profile = await ensureCustomerProfile(user as any);
  return NextResponse.json({ data: profile });
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const data = await upsertCustomerProfile(user.id, {
    ...body,
    email: user.email?.trim().toLowerCase() || body.email,
  });
  return NextResponse.json({ data });
}
