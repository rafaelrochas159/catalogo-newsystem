import { createRequiredServerClient } from '@/lib/supabase/client';
import { getFavoriteProducts } from '@/lib/favorites';

export type AddressInput = {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
};

function isMissingTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('relation')
  );
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function normalizeLegacyAddress(address: any) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  return {
    cep: String(address.cep || ''),
    rua: String(address.rua || ''),
    numero: String(address.numero || ''),
    complemento: address.complemento ? String(address.complemento) : null,
    bairro: String(address.bairro || ''),
    cidade: String(address.cidade || ''),
    estado: String(address.estado || ''),
    principal: true,
  };
}

async function getLegacyCustomer(db: any, userId: string) {
  try {
    const { data, error } = await db
      .from('clientes')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('getLegacyCustomer failed', error);
    }

    return null;
  }
}

async function syncLegacyCustomerRecord(
  db: any,
  userId: string,
  payload: {
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
    cpf_cnpj?: string | null;
    endereco?: any;
  }
) {
  const email = normalizeEmail(payload.email);
  const nome = payload.nome?.trim() || null;

  if (!nome || !email) {
    return;
  }

  try {
    const { error } = await db
      .from('clientes')
      .upsert(
        {
          id: userId,
          nome,
          email,
          telefone: payload.telefone || null,
          cpf_cnpj: payload.cpf_cnpj || null,
          endereco: payload.endereco ?? undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('syncLegacyCustomerRecord failed', error);
    }
  }
}

export async function ensureCustomerProfile(user: { id: string; email?: string | null; user_metadata?: any }) {
  const db = createRequiredServerClient() as any;
  const email = normalizeEmail(user.email);

  try {
    const legacyCustomer = await getLegacyCustomer(db, user.id);
    const { data: existing } = await db
      .from('customer_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const payload = {
      id: user.id,
      email: existing?.email || email,
      nome:
        existing?.nome ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        legacyCustomer?.nome ||
        null,
      telefone:
        existing?.telefone ||
        user.user_metadata?.phone ||
        legacyCustomer?.telefone ||
        null,
      cpf_cnpj:
        existing?.cpf_cnpj ||
        user.user_metadata?.cpf_cnpj ||
        legacyCustomer?.cpf_cnpj ||
        null,
      status: existing?.status || 'ativo',
    };

    if (
      existing &&
      payload.email === existing.email &&
      payload.nome === existing.nome &&
      payload.telefone === existing.telefone &&
      payload.cpf_cnpj === existing.cpf_cnpj
    ) {
      return existing;
    }

    const { data, error } = await db
      .from('customer_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('ensureCustomerProfile failed', error);
    }

    return {
      id: user.id,
      email,
      nome: user.user_metadata?.name || user.user_metadata?.full_name || null,
      telefone: user.user_metadata?.phone || null,
      cpf_cnpj: user.user_metadata?.cpf_cnpj || null,
      status: 'ativo',
    };
  }
}

export async function getCustomerAccount(userId: string, email?: string | null) {
  const db = createRequiredServerClient() as any;
  const normalizedEmail = normalizeEmail(email);
  const safeQuery = async <T>(loader: () => Promise<any>, fallback: T): Promise<T> => {
    try {
      const result = await loader();
      if (result?.error) throw result.error;
      return (result?.data ?? fallback) as T;
    } catch (error) {
      console.error('getCustomerAccount query failed', error);
      return fallback;
    }
  };

  const [profile, addresses, ordersByUser, ordersByEmail, favorites, legacyCustomer] = await Promise.all([
    safeQuery(() => db.from('customer_profiles').select('*').eq('id', userId).maybeSingle(), null),
    safeQuery(() => db.from('customer_addresses').select('*').eq('user_id', userId).order('principal', { ascending: false }), []),
    safeQuery(() => db.from('pedidos').select('*').eq('user_id', userId).order('created_at', { ascending: false }), []),
    normalizedEmail
      ? safeQuery(() => db.from('pedidos').select('*').eq('cliente_email', normalizedEmail).order('created_at', { ascending: false }), [])
      : Promise.resolve([]),
    getFavoriteProducts(userId).catch((error) => {
      console.error('getCustomerAccount favorites failed', error);
      return [];
    }),
    getLegacyCustomer(db, userId),
  ]);

  const mergedOrders = [...(ordersByUser || []), ...(ordersByEmail || [])].reduce<any[]>((acc, order: any) => {
    if (!acc.find((entry) => entry.id === order.id)) {
      acc.push(order);
    }
    return acc;
  }, []);
  mergedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const legacyAddress = normalizeLegacyAddress(legacyCustomer?.endereco);
  const fallbackProfile = (profile as any)
    ? {
        ...(profile as any),
        email: (profile as any).email || normalizedEmail || legacyCustomer?.email || null,
        nome: (profile as any).nome || legacyCustomer?.nome || null,
        telefone: (profile as any).telefone || legacyCustomer?.telefone || null,
        cpf_cnpj: (profile as any).cpf_cnpj || legacyCustomer?.cpf_cnpj || null,
      }
    : (legacyCustomer
      ? {
          id: userId,
          email: normalizedEmail || legacyCustomer.email || null,
          nome: legacyCustomer.nome || null,
          telefone: legacyCustomer.telefone || null,
          cpf_cnpj: legacyCustomer.cpf_cnpj || null,
          status: 'ativo',
        }
      : null);

  return {
    profile: fallbackProfile,
    addresses: (addresses && addresses.length > 0) ? addresses : (legacyAddress ? [{ id: 'legacy-address', user_id: userId, ...legacyAddress }] : []),
    orders: mergedOrders,
    favorites: favorites || [],
  };
}

export async function upsertCustomerProfile(userId: string, input: { nome: string; telefone: string; email?: string; cpf_cnpj?: string | null }) {
  const db = createRequiredServerClient() as any;
  const normalizedEmail = normalizeEmail(input.email);
  const { data, error } = await db
    .from('customer_profiles')
    .upsert({
      id: userId,
      nome: input.nome,
      telefone: input.telefone,
      email: normalizedEmail,
      cpf_cnpj: input.cpf_cnpj || null,
      last_activity: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;

  await syncLegacyCustomerRecord(db, userId, {
    nome: data?.nome || input.nome,
    email: data?.email || normalizedEmail,
    telefone: data?.telefone || input.telefone,
    cpf_cnpj: data?.cpf_cnpj || input.cpf_cnpj || null,
  });

  return data;
}

export async function upsertPrimaryAddress(userId: string, input: AddressInput) {
  const db = createRequiredServerClient() as any;
  await db.from('customer_addresses').update({ principal: false }).eq('user_id', userId);

  const { data, error } = await db
    .from('customer_addresses')
    .insert({
      user_id: userId,
      cep: input.cep,
      rua: input.rua,
      numero: input.numero,
      complemento: input.complemento || null,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
      principal: true,
    })
    .select('*')
    .single();

  if (error) throw error;

  const { data: profile } = await db
    .from('customer_profiles')
    .select('nome, email, telefone, cpf_cnpj')
    .eq('id', userId)
    .maybeSingle();

  await syncLegacyCustomerRecord(db, userId, {
    nome: profile?.nome || null,
    email: profile?.email || null,
    telefone: profile?.telefone || null,
    cpf_cnpj: profile?.cpf_cnpj || null,
    endereco: {
      cep: input.cep,
      rua: input.rua,
      numero: input.numero,
      complemento: input.complemento || null,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
    },
  });

  return data;
}
