import { createRequiredServerClient } from '@/lib/supabase/client';
import { getCustomerAccount } from '@/lib/customer-account';

const RECENT_ACTIVITY_WINDOW_DAYS = 90;

type AdminCustomerProfile = {
  id?: string | null;
  user_id?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  status?: string | null;
  last_activity?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AdminCustomerAddress = {
  id?: string | null;
  user_id?: string | null;
  cep?: string | null;
  rua?: string | null;
  street?: string | null;
  numero?: string | null;
  number?: string | null;
  complemento?: string | null;
  complement?: string | null;
  bairro?: string | null;
  neighborhood?: string | null;
  cidade?: string | null;
  city?: string | null;
  estado?: string | null;
  state?: string | null;
  principal?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AdminCustomerOrder = {
  id: string;
  user_id?: string | null;
  cliente_email?: string | null;
  numero_pedido?: string | null;
  total?: number | null;
  status_pagamento?: string | null;
  status_pedido?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
};

type AdminCustomerPayment = {
  id: string;
  pedido_id?: string | null;
  numero_pedido?: string | null;
  status_pagamento?: string | null;
  valor?: number | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type LegacyCustomer = {
  id?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  endereco?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminCustomerDeletionPolicy = {
  canDeactivate: boolean;
  canDeletePermanently: boolean;
  isRecentlyActive: boolean;
  hasOrders: boolean;
  hasPayments: boolean;
  reason: string;
};

export type AdminCustomerListItem = {
  userId: string;
  profileId: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cpfCnpj: string | null;
  status: string;
  createdAt: string | null;
  lastActivity: string | null;
  hasAddress: boolean;
  addressCount: number;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  isLegacyOnly: boolean;
  deletionPolicy: AdminCustomerDeletionPolicy;
  presenceStatus: 'online' | 'recent' | 'offline';
  presenceLabel: string;
  presenceSortOrder: number;
};

export type AdminCustomerDetail = AdminCustomerListItem & {
  addresses: AdminCustomerAddress[];
  orders: AdminCustomerOrder[];
  payments: AdminCustomerPayment[];
};

function getMinutesAgoLabel(value?: string | null) {
  if (!value) return 'Offline';
  const diffMs = Date.now() - getDateValue(value);
  if (diffMs <= 0) return 'Online agora';

  const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
  if (minutes < 60) {
    return `Ativo ha ${minutes} min`;
  }

  const hours = Math.max(1, Math.floor(minutes / 60));
  if (hours < 24) {
    return `Ativo ha ${hours} h`;
  }

  const days = Math.max(1, Math.floor(hours / 24));
  return `Ativo ha ${days} d`;
}

export function getCustomerPresence(lastActivity?: string | null) {
  const timestamp = getDateValue(lastActivity);
  if (!timestamp) {
    return {
      status: 'offline' as const,
      label: 'Offline',
      sortOrder: 2,
    };
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs <= 60 * 1000) {
    return {
      status: 'online' as const,
      label: 'Online agora',
      sortOrder: 0,
    };
  }

  if (diffMs <= 5 * 60 * 1000) {
    return {
      status: 'recent' as const,
      label: getMinutesAgoLabel(lastActivity),
      sortOrder: 1,
    };
  }

  return {
    status: 'offline' as const,
    label: getMinutesAgoLabel(lastActivity),
    sortOrder: 2,
  };
}

export type AdminCustomerListResult = {
  customers: AdminCustomerListItem[];
  totalCustomers: number;
  totalActive: number;
  totalWithOrders: number;
  error: string | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('relation')
  );
}

function getDateValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isRecentActivity(value?: string | null) {
  if (!value) return false;
  const timestamp = getDateValue(value);
  if (!timestamp) return false;
  const threshold = Date.now() - RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return timestamp >= threshold;
}

function dedupeById<T extends { id?: string | null }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = item.id || '';
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeAddress(address: AdminCustomerAddress | Record<string, unknown> | null | undefined, userId?: string) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  return {
    ...address,
    id: String((address as any).id || ''),
    user_id: String((address as any).user_id || userId || ''),
    cep: String((address as any).cep || ''),
    rua: String((address as any).rua || (address as any).street || ''),
    numero: String((address as any).numero || (address as any).number || ''),
    complemento: String((address as any).complemento || (address as any).complement || ''),
    bairro: String((address as any).bairro || (address as any).neighborhood || ''),
    cidade: String((address as any).cidade || (address as any).city || ''),
    estado: String((address as any).estado || (address as any).state || ''),
    principal: Boolean((address as any).principal),
    created_at: (address as any).created_at || null,
    updated_at: (address as any).updated_at || null,
  } satisfies AdminCustomerAddress;
}

function getAddressCompleteness(address?: AdminCustomerAddress | null) {
  if (!address) return 0;
  return [
    address.cep,
    address.rua || address.street,
    address.numero || address.number,
    address.bairro || address.neighborhood,
    address.cidade || address.city,
    address.estado || address.state,
    address.complemento || address.complement,
  ].filter((value) => typeof value === 'string' && value.trim()).length;
}

function sortAddresses(addresses: AdminCustomerAddress[]) {
  return [...addresses].sort((a, b) => {
    const principalDiff = Number(Boolean(b.principal)) - Number(Boolean(a.principal));
    if (principalDiff !== 0) return principalDiff;

    const completenessDiff = getAddressCompleteness(b) - getAddressCompleteness(a);
    if (completenessDiff !== 0) return completenessDiff;

    return getDateValue(b.updated_at || b.created_at) - getDateValue(a.updated_at || a.created_at);
  });
}

function buildDeletionPolicy(args: {
  hasOrders: boolean;
  hasPayments: boolean;
  lastActivity?: string | null;
  status?: string | null;
}) {
  const recentlyActive = isRecentActivity(args.lastActivity);
  const isInactive = String(args.status || '').trim().toLowerCase() === 'inativo';

  if (args.hasOrders || args.hasPayments) {
    return {
      canDeactivate: true,
      canDeletePermanently: false,
      isRecentlyActive: recentlyActive,
      hasOrders: args.hasOrders,
      hasPayments: args.hasPayments,
      reason: 'Cliente com historico de pedidos ou pagamentos deve ser apenas inativado para preservar integridade.',
    } satisfies AdminCustomerDeletionPolicy;
  }

  if (recentlyActive && !isInactive) {
    return {
      canDeactivate: true,
      canDeletePermanently: false,
      isRecentlyActive: true,
      hasOrders: false,
      hasPayments: false,
      reason: 'Cliente ativo com atividade recente deve ser inativado antes da exclusao permanente.',
    } satisfies AdminCustomerDeletionPolicy;
  }

  return {
    canDeactivate: true,
    canDeletePermanently: true,
    isRecentlyActive: recentlyActive,
    hasOrders: false,
    hasPayments: false,
    reason: isInactive
      ? 'Cliente inativo e sem historico comercial pode ser excluido permanentemente.'
      : 'Cliente sem historico comercial pode ser excluido permanentemente com seguranca.',
  } satisfies AdminCustomerDeletionPolicy;
}

async function safeQuery<T>(loader: () => Promise<any>, fallback: T, context: string): Promise<T> {
  try {
    const result = await loader();
    if (result?.error) throw result.error;
    return (result?.data ?? fallback) as T;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error(`admin customers query failed: ${context}`, error);
    }
    return fallback;
  }
}

async function loadLegacyCustomers(db: any) {
  return safeQuery<LegacyCustomer[]>(
    () => db.from('clientes').select('*').order('updated_at', { ascending: false }),
    [],
    'legacy customers',
  );
}

function mergeCustomers(profiles: AdminCustomerProfile[], legacyCustomers: LegacyCustomer[]) {
  const map = new Map<string, {
    userId: string;
    profile: AdminCustomerProfile | null;
    legacy: LegacyCustomer | null;
  }>();

  for (const profile of profiles) {
    const userId = String(profile.user_id || profile.id || '');
    if (!userId) continue;
    map.set(userId, {
      userId,
      profile,
      legacy: map.get(userId)?.legacy || null,
    });
  }

  for (const legacy of legacyCustomers) {
    const userId = String(legacy.id || '');
    if (!userId) continue;
    const existing = map.get(userId);
    map.set(userId, {
      userId,
      profile: existing?.profile || null,
      legacy,
    });
  }

  return Array.from(map.values());
}

function buildOrderMaps(customers: Array<{ userId: string; profile: AdminCustomerProfile | null; legacy: LegacyCustomer | null }>, orders: AdminCustomerOrder[]) {
  const byUserId = new Map<string, AdminCustomerOrder[]>();
  const emailToUserId = new Map<string, string>();

  for (const customer of customers) {
    const email = normalizeEmail(customer.profile?.email || customer.legacy?.email);
    if (email) {
      emailToUserId.set(email, customer.userId);
    }
  }

  for (const order of orders) {
    const userId = String(order.user_id || '');
    if (userId) {
      const current = byUserId.get(userId) || [];
      current.push(order);
      byUserId.set(userId, current);
      continue;
    }

    const email = normalizeEmail(order.cliente_email);
    if (!email) continue;
    const mappedUserId = emailToUserId.get(email);
    if (!mappedUserId) continue;
    const current = byUserId.get(mappedUserId) || [];
    current.push(order);
    byUserId.set(mappedUserId, current);
  }

  for (const [key, value] of Array.from(byUserId.entries())) {
    byUserId.set(key, dedupeById(value));
  }

  return byUserId;
}

export async function listAdminCustomers(params?: { query?: string; status?: string }) {
  const db = createRequiredServerClient() as any;
  let profiles: AdminCustomerProfile[] = [];
  try {
    const { data, error } = await db
      .from('customer_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    profiles = (data || []) as AdminCustomerProfile[];
  } catch (error: any) {
    console.error('admin customers profiles failed', error);
    return {
      customers: [],
      totalCustomers: 0,
      totalActive: 0,
      totalWithOrders: 0,
      error: error?.message || 'Falha ao consultar customer_profiles.',
    } satisfies AdminCustomerListResult;
  }

  const legacyCustomers = await loadLegacyCustomers(db);
  const mergedCustomers = mergeCustomers(profiles || [], legacyCustomers || []);

  const userIds = mergedCustomers.map((customer) => customer.userId).filter(Boolean);
  const emails = mergedCustomers
    .map((customer) => normalizeEmail(customer.profile?.email || customer.legacy?.email))
    .filter(Boolean) as string[];

  const [addresses, ordersByUser, ordersByEmail] = await Promise.all([
    userIds.length > 0
      ? safeQuery<AdminCustomerAddress[]>(
          () => db.from('customer_addresses').select('*').in('user_id', userIds),
          [],
          'addresses',
        )
      : Promise.resolve([]),
    userIds.length > 0
      ? safeQuery<AdminCustomerOrder[]>(
          () => db.from('pedidos').select('id,user_id,cliente_email,numero_pedido,total,status_pagamento,status_pedido,created_at,paid_at').in('user_id', userIds),
          [],
          'orders by user',
        )
      : Promise.resolve([]),
    emails.length > 0
      ? safeQuery<AdminCustomerOrder[]>(
          () => db.from('pedidos').select('id,user_id,cliente_email,numero_pedido,total,status_pagamento,status_pedido,created_at,paid_at').in('cliente_email', emails),
          [],
          'orders by email',
        )
      : Promise.resolve([]),
  ]);

  const mergedOrders = dedupeById([...(ordersByUser || []), ...(ordersByEmail || [])]);

  const addressesByUserId = new Map<string, AdminCustomerAddress[]>();
  for (const rawAddress of addresses || []) {
    const address = normalizeAddress(rawAddress);
    const userId = String(address?.user_id || '');
    if (!address || !userId) continue;
    const current = addressesByUserId.get(userId) || [];
    current.push(address);
    addressesByUserId.set(userId, sortAddresses(current));
  }

  const orderMap = buildOrderMaps(mergedCustomers, mergedOrders);

  let rows = mergedCustomers.map((customer) => {
    const orders = orderMap.get(customer.userId) || [];
    const lastOrderAt = orders
      .map((order) => order.created_at || null)
      .filter(Boolean)
      .sort((a, b) => getDateValue(b) - getDateValue(a))[0] || null;

    const lastActivity = customer.profile?.last_activity || lastOrderAt || customer.profile?.updated_at || customer.legacy?.updated_at || null;
    const presence = getCustomerPresence(lastActivity);
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const hasPayments = orders.some((order) => Boolean(order.status_pagamento || order.paid_at));

    return {
      userId: customer.userId,
      profileId: customer.profile?.id || null,
      nome: customer.profile?.nome || customer.legacy?.nome || null,
      email: normalizeEmail(customer.profile?.email || customer.legacy?.email),
      telefone: customer.profile?.telefone || customer.legacy?.telefone || null,
      cpfCnpj: customer.profile?.cpf_cnpj || customer.legacy?.cpf_cnpj || null,
      status: customer.profile?.status || 'ativo',
      createdAt: customer.profile?.created_at || customer.legacy?.created_at || null,
      lastActivity,
      hasAddress: (addressesByUserId.get(customer.userId) || []).length > 0 || Boolean(customer.legacy?.endereco),
      addressCount: (addressesByUserId.get(customer.userId) || []).length,
      orderCount: orders.length,
      totalSpent,
      lastOrderAt,
      isLegacyOnly: !customer.profile,
      presenceStatus: presence.status,
      presenceLabel: presence.label,
      presenceSortOrder: presence.sortOrder,
      deletionPolicy: buildDeletionPolicy({
        hasOrders: orders.length > 0,
        hasPayments,
        lastActivity,
        status: customer.profile?.status || 'ativo',
      }),
    } satisfies AdminCustomerListItem;
  });

  const query = String(params?.query || '').trim().toLowerCase();
  if (query) {
    rows = rows.filter((customer) => {
      const haystack = [
        customer.nome,
        customer.email,
        customer.telefone,
        customer.cpfCnpj,
        customer.userId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  const statusFilter = String(params?.status || '').trim().toLowerCase();
  if (statusFilter) {
    rows = rows.filter((customer) => String(customer.status || '').trim().toLowerCase() === statusFilter);
  }

  rows.sort((a, b) => {
    const presenceDiff = a.presenceSortOrder - b.presenceSortOrder;
    if (presenceDiff !== 0) return presenceDiff;

    const activityDiff = getDateValue(b.lastActivity || b.createdAt) - getDateValue(a.lastActivity || a.createdAt);
    if (activityDiff !== 0) return activityDiff;
    return getDateValue(b.createdAt) - getDateValue(a.createdAt);
  });

  return {
    customers: rows,
    totalCustomers: rows.length,
    totalActive: rows.filter((customer) => customer.status !== 'inativo').length,
    totalWithOrders: rows.filter((customer) => customer.orderCount > 0).length,
    error: null,
  } satisfies AdminCustomerListResult;
}

export async function getAdminCustomerDetail(customerId: string) {
  const db = createRequiredServerClient() as any;
  let profile: AdminCustomerProfile | null = null;
  try {
    const { data, error } = await db
      .from('customer_profiles')
      .select('*')
      .or(`user_id.eq.${customerId},id.eq.${customerId}`)
      .maybeSingle();

    if (error) throw error;
    profile = (data || null) as AdminCustomerProfile | null;
  } catch (error: any) {
    console.error('admin customer detail profile failed', error);
    return { customer: null, error: error?.message || 'Falha ao consultar customer_profiles.' as string | null };
  }

  const legacyCustomer = await safeQuery<LegacyCustomer | null>(
    () => db.from('clientes').select('*').eq('id', customerId).maybeSingle(),
    null,
    'detail legacy',
  );

  const resolvedUserId = String(profile?.user_id || profile?.id || legacyCustomer?.id || customerId || '');
  if (!resolvedUserId) {
    return { customer: null, error: 'Cliente nao encontrado.' as string | null };
  }

  const account = await getCustomerAccount(resolvedUserId, profile?.email || legacyCustomer?.email || null);
  const orders = (account.orders || []) as AdminCustomerOrder[];
  const orderIds = orders.map((order) => String(order.id || '')).filter(Boolean);
  const orderNumbers = orders.map((order) => String(order.numero_pedido || '')).filter(Boolean);
  const payments = orderIds.length > 0 || orderNumbers.length > 0
    ? await safeQuery<AdminCustomerPayment[]>(
        () => db.from('pagamentos').select('id,pedido_id,numero_pedido,status_pagamento,valor,paid_at,created_at').or([
          orderIds.length > 0 ? `pedido_id.in.(${orderIds.join(',')})` : null,
          orderNumbers.length > 0 ? `numero_pedido.in.(${orderNumbers.join(',')})` : null,
        ].filter(Boolean).join(',')),
        [],
        'detail payments',
      )
    : [];

  const status = String((account.profile as any)?.status || profile?.status || 'ativo');
  const lastOrderAt = orders
    .map((order) => order.created_at || null)
    .filter(Boolean)
    .sort((a, b) => getDateValue(b) - getDateValue(a))[0] || null;
  const lastActivity = (account.profile as any)?.last_activity || profile?.last_activity || lastOrderAt || profile?.updated_at || legacyCustomer?.updated_at || null;
  const presence = getCustomerPresence(lastActivity);
  const hasPayments = (payments || []).length > 0;

  return {
    customer: {
      userId: resolvedUserId,
      profileId: String((account.profile as any)?.id || profile?.id || ''),
      nome: (account.profile as any)?.nome || profile?.nome || legacyCustomer?.nome || null,
      email: normalizeEmail((account.profile as any)?.email || profile?.email || legacyCustomer?.email),
      telefone: (account.profile as any)?.telefone || profile?.telefone || legacyCustomer?.telefone || null,
      cpfCnpj: (account.profile as any)?.cpf_cnpj || profile?.cpf_cnpj || legacyCustomer?.cpf_cnpj || null,
      status,
      createdAt: (account.profile as any)?.created_at || profile?.created_at || legacyCustomer?.created_at || null,
      lastActivity,
      hasAddress: (account.addresses || []).length > 0,
      addressCount: (account.addresses || []).length,
      orderCount: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      lastOrderAt,
      isLegacyOnly: !(account.profile || profile),
      presenceStatus: presence.status,
      presenceLabel: presence.label,
      presenceSortOrder: presence.sortOrder,
      addresses: sortAddresses(
        ((account.addresses || []) as AdminCustomerAddress[])
          .map((address) => normalizeAddress(address, resolvedUserId))
          .filter(Boolean) as AdminCustomerAddress[],
      ),
      orders: dedupeById(orders),
      payments: dedupeById(payments || []),
      deletionPolicy: buildDeletionPolicy({
        hasOrders: orders.length > 0,
        hasPayments,
        lastActivity,
        status,
      }),
    } satisfies AdminCustomerDetail,
    error: null as string | null,
  };
}

async function deleteOptionalRows(db: any, table: string, userId: string) {
  try {
    const { error } = await db.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
}

export async function updateAdminCustomerStatus(userId: string, status: 'ativo' | 'inativo') {
  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('customer_profiles')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('id,user_id,status')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Cliente nao encontrado para atualizar status.');
  }

  return data;
}

export async function removeAdminCustomer(userId: string) {
  const detailResult = await getAdminCustomerDetail(userId);
  if (!detailResult.customer) {
    throw new Error(detailResult.error || 'Cliente nao encontrado.');
  }

  if (!detailResult.customer.deletionPolicy.canDeletePermanently) {
    throw new Error(detailResult.customer.deletionPolicy.reason);
  }

  const db = createRequiredServerClient() as any;

  await deleteOptionalRows(db, 'customer_addresses', userId);
  await deleteOptionalRows(db, 'favorite_products', userId);
  await deleteOptionalRows(db, 'abandoned_carts', userId);
  await deleteOptionalRows(db, 'user_events', userId);
  await deleteOptionalRows(db, 'marketing_events', userId);

  await safeQuery(() => db.from('clientes').delete().eq('id', userId), null, 'delete legacy customer');

  const { error: profileError } = await db
    .from('customer_profiles')
    .delete()
    .eq('user_id', userId);

  if (profileError) throw profileError;

  const { error: authError } = await db.auth.admin.deleteUser(userId);
  if (authError) {
    const authMessage = String(authError.message || '').toLowerCase();
    if (authMessage.includes('not found') || authMessage.includes('user does not exist')) {
      return true;
    }
    console.error('admin customer auth delete failed', authError);
    throw new Error('Cadastro removido do banco, mas a conta de autenticacao nao foi excluida automaticamente.');
  }

  return true;
}
