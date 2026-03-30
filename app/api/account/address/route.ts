import { NextResponse } from 'next/server';
import { upsertPrimaryAddress } from '@/lib/customer-account';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const data = await upsertPrimaryAddress(user.id, body);
  return NextResponse.json({ data });
}
