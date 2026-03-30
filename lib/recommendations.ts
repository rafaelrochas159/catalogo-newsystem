import { Produto } from '@/types';
import { createRequiredServerClient, createServerClient } from '@/lib/supabase/client';

export type RecommendationContext = 'product' | 'cart' | 'post-purchase' | 'orders';

type RecommendationInput = {
  userId?: string | null;
  email?: string | null;
  anonymousId?: string | null;
  productIds?: string[];
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA' | null;
  context?: RecommendationContext;
  limit?: number;
};

type UserSignals = {
  viewedProductIds: string[];
  purchasedProductIds: string[];
  viewedCategoryIds: string[];
  purchasedCategoryIds: string[];
  preferredCatalogType: 'UNITARIO' | 'CAIXA_FECHADA' | null;
};

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function oppositeCatalogType(catalogType?: string | null) {
  return catalogType === 'CAIXA_FECHADA' ? 'UNITARIO' : 'CAIXA_FECHADA';
}

async function getGenericRecommendations(params: {
  limit: number;
  excludeIds?: string[];
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA' | null;
}) {
  const db = createServerClient() as any;
  const { data } = await db
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('is_active', true)
    .in('tipo_catalogo', params.catalogType ? [params.catalogType, 'AMBOS'] : ['UNITARIO', 'CAIXA_FECHADA', 'AMBOS'])
    .order('destaque_home', { ascending: false })
    .order('is_mais_vendido', { ascending: false })
    .order('is_destaque', { ascending: false })
    .order('is_promocao', { ascending: false })
    .order('visualizacoes', { ascending: false })
    .limit(Math.max(params.limit * 2, 12));

  return (data || [])
    .filter((product: Produto) => !(params.excludeIds || []).includes(product.id))
    .slice(0, params.limit);
}

async function getUserSignals(params: RecommendationInput): Promise<UserSignals> {
  const serviceDb = createRequiredServerClient() as any;
  const email = normalizeEmail(params.email);

  const marketingBaseQuery = serviceDb
    .from('marketing_events')
    .select('event_name, product_id, metadata');

  const marketingQuery = params.userId
    ? marketingBaseQuery.eq('user_id', params.userId)
    : email
      ? marketingBaseQuery.eq('email', email)
      : params.anonymousId
        ? marketingBaseQuery.eq('anonymous_id', params.anonymousId)
        : null;

  const { data: events } = marketingQuery
    ? await marketingQuery
        .in('event_name', ['product_view', 'view_item', 'add_to_cart', 'favorite_added'])
        .order('created_at', { ascending: false })
        .limit(40)
    : { data: [] };

  const orderBaseQuery = serviceDb
    .from('pedidos')
    .select('itens, tipo_catalogo')
    .eq('status_pagamento', 'approved');

  const orderQuery = params.userId
    ? orderBaseQuery.eq('user_id', params.userId)
    : email
      ? orderBaseQuery.eq('cliente_email', email)
      : null;

  const { data: orders } = orderQuery
    ? await orderQuery.order('created_at', { ascending: false }).limit(20)
    : { data: [] };

  const viewedProductIds = uniqueIds((events || []).map((event: any) => event.product_id));
  const purchasedProductIds = uniqueIds(
    (orders || []).flatMap((order: any) =>
      Array.isArray(order.itens)
        ? order.itens.map((item: any) => item.product_id || item.produto_id)
        : [],
    ),
  );

  const allSignalProductIds = uniqueIds([...viewedProductIds, ...purchasedProductIds]);
  let viewedCategoryIds: string[] = [];
  let purchasedCategoryIds: string[] = [];

  if (allSignalProductIds.length > 0) {
    const { data: signalProducts } = await serviceDb
      .from('produtos')
      .select('id, categoria_id')
      .in('id', allSignalProductIds);

    viewedCategoryIds = uniqueIds(
      (signalProducts || [])
        .filter((product: any) => viewedProductIds.includes(product.id))
        .map((product: any) => product.categoria_id),
    );
    purchasedCategoryIds = uniqueIds(
      (signalProducts || [])
        .filter((product: any) => purchasedProductIds.includes(product.id))
        .map((product: any) => product.categoria_id),
    );
  }

  const preferredCatalogType = (() => {
    const orderCounts = (orders || []).reduce(
      (acc: Record<string, number>, order: any) => {
        const key = order.tipo_catalogo || 'UNITARIO';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {},
    );

    if ((orderCounts.CAIXA_FECHADA || 0) > (orderCounts.UNITARIO || 0)) {
      return 'CAIXA_FECHADA' as const;
    }

    if ((orderCounts.UNITARIO || 0) > 0) {
      return 'UNITARIO' as const;
    }

    return null;
  })();

  return {
    viewedProductIds,
    purchasedProductIds,
    viewedCategoryIds,
    purchasedCategoryIds,
    preferredCatalogType,
  };
}

function scoreCandidate(args: {
  candidate: any;
  sourceProductIds: string[];
  sourceProducts: any[];
  userSignals: UserSignals;
  orderedTogetherScores: Map<string, number>;
  manualIds: string[];
  requestedCatalogType?: string | null;
  context?: RecommendationContext;
}) {
  const { candidate, sourceProductIds, sourceProducts, userSignals, orderedTogetherScores, manualIds, requestedCatalogType, context } = args;
  let score = 0;

  if (manualIds.includes(candidate.id)) score += 60;
  if (orderedTogetherScores.has(candidate.id)) score += orderedTogetherScores.get(candidate.id) || 0;
  if (candidate.destaque_home) score += 14;
  if (candidate.is_mais_vendido) score += 18;
  if (candidate.is_destaque) score += 10;
  if (candidate.is_promocao) score += 8;
  score += Math.min(Number(candidate.visualizacoes || 0) / 50, 12);

  if (userSignals.viewedProductIds.includes(candidate.id)) score += 16;
  if (userSignals.purchasedProductIds.includes(candidate.id)) score += 12;
  if (userSignals.viewedCategoryIds.includes(candidate.categoria_id)) score += 10;
  if (userSignals.purchasedCategoryIds.includes(candidate.categoria_id)) score += 14;

  const requestedCatalog = requestedCatalogType || userSignals.preferredCatalogType;
  if (requestedCatalog && (candidate.tipo_catalogo === requestedCatalog || candidate.tipo_catalogo === 'AMBOS')) {
    score += 10;
  }

  if (context === 'product' && requestedCatalogType) {
    const oppositeType = oppositeCatalogType(requestedCatalogType);
    if (candidate.tipo_catalogo === oppositeType || candidate.tipo_catalogo === 'AMBOS') {
      score += 12;
    }
  }

  if (
    sourceProducts.some(
      (product) =>
        product.categoria_id &&
        product.categoria_id === candidate.categoria_id,
    )
  ) {
    score += 12;
  }

  if (sourceProductIds.includes(candidate.id)) {
    score = -1;
  }

  return score;
}

export async function getAiRecommendations(params: RecommendationInput) {
  const limit = Math.min(Math.max(params.limit || 8, 1), 12);
  const sourceProductIds = uniqueIds(params.productIds || []);
  const publicDb = createServerClient() as any;
  const serviceDb = createRequiredServerClient() as any;
  const userSignals = await getUserSignals(params);

  const allSignalProductIds = uniqueIds([
    ...sourceProductIds,
    ...userSignals.viewedProductIds,
    ...userSignals.purchasedProductIds,
  ]);

  const { data: sourceProducts } = allSignalProductIds.length
    ? await publicDb
        .from('produtos')
        .select('*')
        .in('id', allSignalProductIds)
        .eq('is_active', true)
    : { data: [] };

  const manualIds = uniqueIds(
    (sourceProducts || [])
      .filter((product: any) => sourceProductIds.includes(product.id))
      .flatMap((product: any) => product.related_product_ids || []),
  ).filter((id) => !sourceProductIds.includes(id));

  const relevantCategoryIds = uniqueIds(
    (sourceProducts || []).map((product: any) => product.categoria_id),
  );

  const orderedTogetherScores = new Map<string, number>();
  if (sourceProductIds.length > 0) {
    const { data: recentOrders } = await serviceDb
      .from('pedidos')
      .select('itens')
      .eq('status_pagamento', 'approved')
      .order('created_at', { ascending: false })
      .limit(160);

    (recentOrders || []).forEach((order: any) => {
      const ids = uniqueIds(
        Array.isArray(order.itens)
          ? order.itens.map((item: any) => item.product_id || item.produto_id)
          : [],
      );

      if (!ids.some((id) => sourceProductIds.includes(id))) return;

      ids.forEach((id) => {
        if (!sourceProductIds.includes(id)) {
          orderedTogetherScores.set(id, (orderedTogetherScores.get(id) || 0) + 10);
        }
      });
    });
  }

  const prioritizedIds = uniqueIds([
    ...manualIds,
    ...Array.from(orderedTogetherScores.keys()),
    ...userSignals.viewedProductIds,
    ...userSignals.purchasedProductIds,
  ]).filter((id) => !sourceProductIds.includes(id));

  let candidates: any[] = [];

  if (prioritizedIds.length > 0) {
    const { data } = await publicDb
      .from('produtos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .in('id', prioritizedIds)
      .eq('is_active', true)
      .limit(Math.max(limit * 2, 12));

    candidates = data || [];
  }

  if (candidates.length < limit && relevantCategoryIds.length > 0) {
    const { data } = await publicDb
      .from('produtos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .eq('is_active', true)
      .in('categoria_id', relevantCategoryIds)
      .limit(18);

    candidates = [...candidates, ...(data || [])];
  }

  if (candidates.length < limit) {
    candidates = [
      ...candidates,
      ...(await getGenericRecommendations({
        limit: Math.max(limit, 8),
        excludeIds: sourceProductIds,
        catalogType: params.catalogType || userSignals.preferredCatalogType,
      })),
    ];
  }

  const dedupedCandidates = Array.from(
    new Map(candidates.map((product) => [product.id, product])).values(),
  ).filter((product: any) => !sourceProductIds.includes(product.id));

  const scored = dedupedCandidates
    .map((candidate: any) => ({
      candidate,
      score: scoreCandidate({
        candidate,
        sourceProductIds,
        sourceProducts: sourceProducts || [],
        userSignals,
        orderedTogetherScores,
        manualIds,
        requestedCatalogType: params.catalogType,
        context: params.context,
      }),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length) {
    return {
      strategy: 'fallback',
      data: await getGenericRecommendations({
        limit,
        excludeIds: sourceProductIds,
        catalogType: params.catalogType,
      }),
    };
  }

  return {
    strategy: sourceProductIds.length || userSignals.viewedProductIds.length || userSignals.purchasedProductIds.length
      ? 'behavioral'
      : 'fallback',
    data: scored.map((item) => item.candidate),
  };
}
