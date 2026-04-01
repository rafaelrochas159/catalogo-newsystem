import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { ensureCustomerProfile, touchCustomerActivity } from '@/lib/customer-account';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    let data = await touchCustomerActivity(user.id);
    if (!data) {
      await ensureCustomerProfile(user as any);
      data = await touchCustomerActivity(user.id);
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('POST /api/account/activity failed', error);
    return NextResponse.json(
      { error: 'Nao foi possivel registrar a atividade do cliente.' },
      { status: 500 },
    );
  }
}
