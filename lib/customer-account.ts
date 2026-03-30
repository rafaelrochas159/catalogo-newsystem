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

export async function ensureCustomerProfile(user: { id: string; email?: string | null; user_metadata?: any }) {
  const db = createRequiredServerClient() as any;
  const email = user.email?.trim().toLowerCase() || null;

  try {
    const { data: existing } = await db
      .from('customer_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) return existing;

    const payload = {
      id: user.id,
      email,
      nome: user.user_metadata?.name || user.user_metadata?.full_name || null,
      telefone: user.user_metadata?.phone || null,
      status: 'ativo',
    };

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
      status: 'ativo',
    };
  }
}

export async function getCustomerAccount(userId: string, email?: string | null) {
  const db = createRequiredServerClient() as any;
  const normalizedEmail = email?.trim().toLowerCase() || null;
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

  const [profile, addresses, orders, favorites] = await Promise.all([
    safeQuery(() => db.from('customer_profiles').select('*').eq('id', userId).maybeSingle(), null),
    safeQuery(() => db.from('customer_addresses').select('*').eq('user_id', userId).order('principal', { ascending: false }), []),
    normalizedEmail
      ? safeQuery(() => db.from('pedidos').select('*').eq('cliente_email', normalizedEmail).order('created_at', { ascending: false }), [])
      : Promise.resolve([]),
    getFavoriteProducts(userId).catch((error) => {
      console.error('getCustomerAccount favorites failed', error);
      return [];
    }),
  ]);

  return {
    profile: profile || null,
    addresses: addresses || [],
    orders: orders || [],
    favorites: favorites || [],
  };
}

export async function upsertCustomerProfile(userId: string, input: { nome: string; telefone: string; email?: string; cpf_cnpj?: string | null }) {
  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('customer_profiles')
    .upsert({
      id: userId,
      nome: input.nome,
      telefone: input.telefone,
      email: input.email?.trim().toLowerCase() || null,
      cpf_cnpj: input.cpf_cnpj || null,
      last_activity: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
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
  return data;
}
