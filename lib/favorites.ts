import { createRequiredServerClient } from '@/lib/supabase/client';

export async function getFavoriteProducts(userId: string) {
  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('favorite_products')
    .select(`
      id,
      product_id,
      created_at,
      produto:produtos(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addFavoriteProduct(userId: string, productId: string) {
  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('favorite_products')
    .upsert({
      user_id: userId,
      product_id: productId,
    }, { onConflict: 'user_id,product_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavoriteProduct(userId: string, productId: string) {
  const db = createRequiredServerClient() as any;
  const { error } = await db
    .from('favorite_products')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (error) throw error;
  return true;
}
