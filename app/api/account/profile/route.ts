import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { ensureCustomerProfile, upsertCustomerProfile } from '@/lib/customer-account';

export async function GET() {
  const db = createRequiredServerClient() as any;
  const { data: auth } = await db.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const profile = await ensureCustomerProfile(user as any);
  return NextResponse.json({ data: profile });
}

export async function POST(request: Request) {
  const db = createRequiredServerClient() as any;
  const { data: auth } = await db.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await request.json();
  const data = await upsertCustomerProfile(user.id, body);
  return NextResponse.json({ data });
}
