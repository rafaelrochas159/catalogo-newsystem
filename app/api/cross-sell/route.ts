import { NextResponse } from 'next/server';
import { createRequiredServerClient, createServerClient } from '@/lib/supabase/client';

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const cartProductIds = uniqueIds((url.searchParams.get('productIds') || '').split(','));
    const catalogType = url.searchParams.get('catalogType');
    const mode = url.searchParams.get('mode');

    const publicDb = createServerClient() as any;
    const serviceDb = createRequiredServerClient() as any;
    const sourceProductIds = uniqueIds([productId, ...cartProductIds]);

    if (!sourceProductIds.length) {
      return NextResponse.json({ data: [] });
    }

    const { data: sourceProducts } = await publicDb
      .from('produtos')
      .select('*')
      .in('id', sourceProductIds)
      .eq('is_active', true);

    const manualIds = uniqueIds(
      (sourceProducts || []).flatMap((product: any) => product.related_product_ids || []),
    ).filter((id) => !sourceProductIds.includes(id));

    const categoryIds = uniqueIds((sourceProducts || []).map((product: any) => product.categoria_id));
    const targetCatalogType = mode === 'cart'
      ? catalogType || 'UNITARIO'
      : catalogType === 'UNITARIO'
        ? 'CAIXA_FECHADA'
        : 'UNITARIO';

    const orderedTogetherIds = new Map<string, number>();
    const { data: recentOrders } = await serviceDb
      .from('pedidos')
      .select('itens')
      .eq('status_pagamento', 'approved')
      .order('created_at', { ascending: false })
      .limit(120);

    (recentOrders || []).forEach((order: any) => {
      const ids = uniqueIds(
        Array.isArray(order.itens)
          ? order.itens.map((item: any) => item.product_id || item.produto_id)
          : [],
      );

      if (!ids.some((id) => sourceProductIds.includes(id))) return;

      ids.forEach((id) => {
        if (!sourceProductIds.includes(id)) {
          orderedTogetherIds.set(id, (orderedTogetherIds.get(id) || 0) + 1);
        }
      });
    });

    const orderedIds = Array.from(orderedTogetherIds.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const prioritizedIds = uniqueIds([...manualIds, ...orderedIds]);

    const candidateQuery = publicDb
      .from('produtos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .eq('is_active', true)
      .neq('id', sourceProductIds[0])
      .limit(12);

    let candidates: any[] = [];
    if (prioritizedIds.length) {
      const { data } = await candidateQuery.in('id', prioritizedIds);
      candidates = data || [];
    }

    if (candidates.length < 6 && categoryIds.length) {
      const { data } = await publicDb
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*)
        `)
        .eq('is_active', true)
        .in('categoria_id', categoryIds)
        .in('tipo_catalogo', [targetCatalogType, 'AMBOS'])
        .order('is_mais_vendido', { ascending: false })
        .order('is_promocao', { ascending: false })
        .limit(8);

      candidates = [...candidates, ...(data || [])];
    }

    const uniqueCandidates = Array.from(
      new Map(candidates.map((product) => [product.id, product])).values(),
    )
      .filter((product) => !sourceProductIds.includes(product.id))
      .slice(0, 8);

    return NextResponse.json({ data: uniqueCandidates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar cross-sell.' }, { status: 500 });
  }
}
