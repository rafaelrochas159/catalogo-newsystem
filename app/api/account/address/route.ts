import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { upsertPrimaryAddress } from '@/lib/customer-account';

export async function POST(request: Request) {
  const db = createRequiredServerClient() as any;
  const { data: auth } = await db.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const data = await upsertPrimaryAddress(user.id, body);
  return NextResponse.json({ data });
}
