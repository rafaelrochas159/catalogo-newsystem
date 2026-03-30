import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verifica se as variáveis estão configuradas
const isConfigured = supabaseUrl && supabaseAnonKey;

// Cliente do Supabase para uso no browser
export const supabase = isConfigured 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createMockClient();

// Cliente para uso em Server Components/Actions
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) {
    console.warn('⚠️ Supabase não configurado. Retornando dados mockados.');
    return createMockClient();
  }
  
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  });
};


export const createRequiredServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key) {
    throw new Error('Supabase server não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Cliente mock para quando o Supabase não está configurado
function createMockClient() {
  const listResult = Promise.resolve({ data: [], error: null, count: 0 });
  const singleResult = Promise.resolve({ data: null, error: null, count: 0 });

  const createQueryBuilder = (
    result: Promise<{ data: any; error: any; count: number }>
  ) => {
    const builder: any = {
      select: (_columns?: string, options?: { head?: boolean }) => (
        options?.head
          ? createQueryBuilder(Promise.resolve({ data: [], error: null, count: 0 }))
          : createQueryBuilder(listResult)
      ),
      insert: () => createQueryBuilder(singleResult),
      update: () => createQueryBuilder(singleResult),
      upsert: () => createQueryBuilder(singleResult),
      delete: () => createQueryBuilder(singleResult),
      eq: () => builder,
      neq: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      like: () => builder,
      ilike: () => builder,
      is: () => builder,
      in: () => builder,
      contains: () => builder,
      overlap: () => builder,
      overlaps: () => builder,
      or: () => builder,
      match: () => builder,
      not: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => singleResult,
      maybeSingle: () => singleResult,
      then: result.then.bind(result),
      catch: result.catch.bind(result),
      finally: result.finally.bind(result),
    };

    return builder;
  };

  return {
    from: (_table: string) => createQueryBuilder(listResult),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase não configurado' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Supabase não configurado' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        listBuckets: () => Promise.resolve({ data: [], error: null }),
      }),
    },
  } as any;
}
