import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * API Route: GET /api/recommendations
 *
 * Returns a list of products recommended for cross‑selling on the
 * "Meus Pedidos" page. The logic prioritizes featured products and
 * best‑sellers, then falls back to the most recently created products
 * if there are not enough items. Only active products are returned.
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Query for featured and best seller products first
    const { data: featured, error: featuredError } = await supabase
      .from('produtos')
      .select('*')
      .eq('is_active', true)
      .or('is_destaque.eq.true,is_mais_vendido.eq.true')
      .order('is_destaque', { ascending: false })
      .order('is_mais_vendido', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (featuredError) {
      console.error('Erro ao buscar produtos recomendados:', featuredError);
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
    }

    // If there are fewer than 4 products, fetch additional active products
    let products = featured || [];
    if (products.length < 4) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('produtos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (!fallbackError && fallback) {
        // Merge and dedupe by product id
        const ids = new Set(products.map((p: any) => p.id));
        for (const p of fallback) {
          if (!ids.has(p.id)) {
            products.push(p);
            ids.add(p.id);
          }
          if (products.length >= 8) break;
        }
      }
    }

    return NextResponse.json({ data: products });
  } catch (error: any) {
    console.error('Erro inesperado ao buscar produtos recomendados:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}