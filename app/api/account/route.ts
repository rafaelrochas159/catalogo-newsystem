import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { ensureCustomerProfile, getCustomerAccount } from '@/lib/customer-account';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'NÃ£o autenticado' }, { status: 401 });
  }

  await ensureCustomerProfile(user as any);
  const data = await getCustomerAccount(user.id, user.email || null);

  return NextResponse.json({ data });
}
