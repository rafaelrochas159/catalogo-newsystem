import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { upsertCustomerProfile, upsertPrimaryAddress } from '@/lib/customer-account';
import {
  hasAddressPayload,
  normalizeCpfCnpj,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  validateAddressPayload,
  validateRegistrationPayload,
} from '@/lib/customer-validation';

type RegisterBody = {
  nome?: string;
  email?: string;
  password?: string;
  telefone?: string;
  cpf_cnpj?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

function debugRegistration(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.info(`[register] ${message}`, details);
}

export async function POST(request: Request) {
  let createdUserId: string | null = null;

  try {
    const body = (await request.json()) as RegisterBody;
    const validationError =
      validateRegistrationPayload(body) ||
      (hasAddressPayload(body) ? validateAddressPayload(body) : null);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const nome = normalizeName(body.nome);
    const email = normalizeEmail(body.email);
    const telefone = normalizePhone(body.telefone);
    const cpfCnpj = normalizeCpfCnpj(body.cpf_cnpj);
    const password = String(body.password || '');
    const addressPayload = hasAddressPayload(body)
      ? {
          cep: String(body.cep || '').trim(),
          rua: String(body.rua || '').trim(),
          numero: String(body.numero || '').trim(),
          complemento: String(body.complemento || '').trim(),
          bairro: String(body.bairro || '').trim(),
          cidade: String(body.cidade || '').trim(),
          estado: String(body.estado || '').trim().toUpperCase(),
        }
      : null;
    const db = createRequiredServerClient() as any;

    debugRegistration('validated payload', {
      email,
      hasPhone: Boolean(telefone),
      cpfLength: cpfCnpj.length,
      hasAddress: Boolean(addressPayload),
    });

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: nome,
        phone: telefone,
        cpf_cnpj: cpfCnpj,
      },
      app_metadata: {},
    });

    if (authError || !authData?.user) {
      const message = String(authError?.message || '');
      const status = message.toLowerCase().includes('already') ? 409 : 400;
      return NextResponse.json(
        { error: authError?.message || 'Nao foi possivel criar sua conta.' },
        { status }
      );
    }

    createdUserId = authData.user.id;

    const profile = await upsertCustomerProfile(authData.user.id, {
      nome,
      email,
      telefone,
      cpf_cnpj: cpfCnpj,
    });

    const address = addressPayload
      ? await upsertPrimaryAddress(authData.user.id, addressPayload)
      : null;

    debugRegistration('user persisted', {
      userId: authData.user.id,
      profileSaved: Boolean(profile?.user_id || profile?.id),
      addressSaved: Boolean(address?.id),
    });

    return NextResponse.json({
      data: {
        user_id: authData.user.id,
        email,
      },
    });
  } catch (error: any) {
    console.error('POST /api/auth/register failed', error);

    if (createdUserId) {
      try {
        const db = createRequiredServerClient() as any;
        await db.auth.admin.deleteUser(createdUserId);
      } catch (rollbackError) {
        console.error('register rollback failed', rollbackError);
      }
    }

    return NextResponse.json(
      { error: error?.message || 'Nao foi possivel concluir o cadastro.' },
      { status: 500 }
    );
  }
}
