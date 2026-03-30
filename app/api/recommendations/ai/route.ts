import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { getAiRecommendations, type RecommendationContext } from '@/lib/recommendations';

function parseProductIds(value: string | null) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    const url = new URL(request.url);
    const context = (url.searchParams.get('context') || 'product') as RecommendationContext;
    const productId = url.searchParams.get('productId');
    const productIds = parseProductIds(url.searchParams.get('productIds'));
    const catalogType = (url.searchParams.get('catalogType') || null) as 'UNITARIO' | 'CAIXA_FECHADA' | null;
    const limit = Number(url.searchParams.get('limit') || 8);
    const anonymousId = url.searchParams.get('anonymousId');

    const result = await getAiRecommendations({
      userId: user?.id || null,
      email: user?.email || null,
      anonymousId,
      productIds: productId ? [productId, ...productIds] : productIds,
      catalogType,
      context,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar recomendacoes.' },
      { status: 500 },
    );
  }
}
