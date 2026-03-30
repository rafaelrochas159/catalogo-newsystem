import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { upsertPrimaryAddress } from '@/lib/customer-account';
import { validateAddressPayload } from '@/lib/customer-validation';

function debugAddress(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.info(`[account/address] ${message}`, details);
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const validationError = validateAddressPayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    debugAddress('saving address', {
      userId: user.id,
      cep: String(body?.cep || ''),
      city: String(body?.cidade || ''),
    });

    const data = await upsertPrimaryAddress(user.id, {
      cep: String(body.cep || '').trim(),
      rua: String(body.rua || '').trim(),
      numero: String(body.numero || '').trim(),
      complemento: String(body.complemento || '').trim(),
      bairro: String(body.bairro || '').trim(),
      cidade: String(body.cidade || '').trim(),
      estado: String(body.estado || '').trim().toUpperCase(),
    });

    debugAddress('address saved', {
      userId: user.id,
      addressId: data?.id || null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/account/address failed', error);
    return NextResponse.json({ error: 'Nao foi possivel salvar seu endereco.' }, { status: 500 });
  }
}
