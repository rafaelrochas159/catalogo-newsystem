import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { createRequiredServerClient, createServerClient } from '@/lib/supabase/client';

/**
 * API Route: GET /api/recommendations
 *
 * Returns a list of products recommended for cross‑selling on the
 * "Meus Pedidos" page. The logic prioritizes featured products and
 * best‑sellers, then falls back to the most recently created products
 * if there are not enough items. Only active products are returned.
 */
async function getGenericRecommendations() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select('*')
    .eq('is_active', true)
    .or('destaque_home.eq.true,is_destaque.eq.true,is_mais_vendido.eq.true,is_promocao.eq.true')
    .order('destaque_home', { ascending: false })
    .order('is_destaque', { ascending: false })
    .order('is_mais_vendido', { ascending: false })
    .order('is_promocao', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8);

  return data || [];
}

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ data: await getGenericRecommendations() });
    }

    const serviceClient = createRequiredServerClient() as any;
    const normalizedEmail = user.email.trim().toLowerCase();

    // Busca somente produtos marcados como destaque ou mais vendidos e que estejam ativos.
    // Dessa forma, o administrador controla exatamente quais itens aparecem na seção
    // "Aproveite e compre mais" pelo painel de produtos (tornando produtos
    // "Mais Vendido" ou "Em Destaque"). Se nenhum produto estiver marcado,
    // a lista retornará vazia e a seção não será exibida no front-end.
    const { data: orders, error: ordersError } = await serviceClient
      .from('pedidos')
      .select('itens')
      .eq('cliente_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      throw ordersError;
    }

    const orderedProductIds = Array.from(new Set(
      (orders || []).flatMap((order: any) =>
        Array.isArray(order.itens)
          ? order.itens.map((item: any) => item.product_id || item.produto_id).filter(Boolean)
          : [],
      ),
    ));

    if (orderedProductIds.length === 0) {
      return NextResponse.json({ data: await getGenericRecommendations() });
    }

    const { data: boughtProducts } = await serviceClient
      .from('produtos')
      .select('categoria_id')
      .in('id', orderedProductIds);

    const categoryIds = Array.from(
      new Set((boughtProducts || []).map((product: any) => product.categoria_id).filter(Boolean)),
    );

    if (categoryIds.length === 0) {
      return NextResponse.json({ data: await getGenericRecommendations() });
    }

    const { data: recommended, error } = await serviceClient
      .from('produtos')
      .select('*')
      .eq('is_active', true)
      .in('categoria_id', categoryIds)
      .or('destaque_home.eq.true,is_destaque.eq.true,is_mais_vendido.eq.true,is_promocao.eq.true')
      .order('destaque_home', { ascending: false })
      .order('is_mais_vendido', { ascending: false })
      .order('is_destaque', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: recommended && recommended.length > 0
        ? recommended
        : await getGenericRecommendations(),
    });
  } catch (error: any) {
    console.error('Erro inesperado ao buscar produtos recomendados:', error);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
