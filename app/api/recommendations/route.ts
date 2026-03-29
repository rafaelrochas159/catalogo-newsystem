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

    // Busca somente produtos marcados como destaque ou mais vendidos e que estejam ativos.
    // Dessa forma, o administrador controla exatamente quais itens aparecem na seção
    // "Aproveite e compre mais" pelo painel de produtos (tornando produtos
    // "Mais Vendido" ou "Em Destaque"). Se nenhum produto estiver marcado,
    // a lista retornará vazia e a seção não será exibida no front-end.
    const { data: recommended, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('is_active', true)
      .or('is_destaque.eq.true,is_mais_vendido.eq.true')
      .order('is_destaque', { ascending: false })
      .order('is_mais_vendido', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Erro ao buscar produtos recomendados:', error);
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
    }
    return NextResponse.json({ data: recommended || [] });
  } catch (error: any) {
    console.error('Erro inesperado ao buscar produtos recomendados:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}