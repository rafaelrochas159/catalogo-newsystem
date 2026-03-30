import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { ensureCustomerProfile, upsertCustomerProfile } from '@/lib/customer-account';
import { normalizeCpfCnpj, normalizePhone, validateProfilePayload } from '@/lib/customer-validation';

function debugProfile(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.info(`[account/profile] ${message}`, details);
}

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const profile = await ensureCustomerProfile(user as any);

    debugProfile('profile loaded', {
      userId: user.id,
      hasPhone: Boolean(profile?.telefone),
      hasCpf: Boolean(profile?.cpf_cnpj),
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('GET /api/account/profile failed', error);
    return NextResponse.json({ error: 'Nao foi possivel carregar seus dados.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const validationError = validateProfilePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    debugProfile('saving profile', {
      userId: user.id,
      hasPhone: Boolean(body?.telefone),
      hasCpf: Boolean(body?.cpf_cnpj),
    });

    const data = await upsertCustomerProfile(user.id, {
      nome: String(body.nome || '').trim(),
      telefone: normalizePhone(body.telefone),
      email: user.email?.trim().toLowerCase() || body.email,
      cpf_cnpj: normalizeCpfCnpj(body.cpf_cnpj),
    });

    debugProfile('profile saved', {
      userId: user.id,
      profileId: data?.id || null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/account/profile failed', error);
    return NextResponse.json({ error: 'Nao foi possivel salvar seus dados.' }, { status: 500 });
  }
}
