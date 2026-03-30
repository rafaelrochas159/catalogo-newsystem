import { createRequiredServerClient } from '@/lib/supabase/client';

export type AddressInput = {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export async function ensureCustomerProfile(user: { id: string; email?: string | null; user_metadata?: any }) {
  const db = createRequiredServerClient() as any;
  const email = user.email?.trim().toLowerCase() || null;

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
}

export async function getCustomerAccount(userId: string, email?: string | null) {
  const db = createRequiredServerClient() as any;
  const normalizedEmail = email?.trim().toLowerCase() || null;
  const ordersQuery = normalizedEmail
    ? db.from('pedidos').select('*').eq('cliente_email', normalizedEmail).order('created_at', { ascending: false })
    : Promise.resolve({ data: [] });

  const [{ data: profile }, { data: addresses }, { data: orders }] = await Promise.all([
    db.from('customer_profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('customer_addresses').select('*').eq('user_id', userId).order('principal', { ascending: false }),
    ordersQuery,
  ]);

  return {
    profile: profile || null,
    addresses: addresses || [],
    orders: orders || [],
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
