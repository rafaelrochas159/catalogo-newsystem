import { createRequiredServerClient } from '@/lib/supabase/client';

type DashboardAlert = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
};

type ProductInsight = {
  productId: string;
  nome: string;
  sku: string;
  views: number;
  addToCart: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
  insight: string;
};

type ExperimentResult = {
  testKey: string;
  testName: string;
  variantKey: string;
  exposures: number;
  checkouts: number;
  purchases: number;
  checkoutRate: number;
  purchaseRate: number;
};

function identityFromRecord(record: any) {
  return (
    (record.user_id ? `user:${record.user_id}` : null) ||
    (record.email ? `email:${String(record.email).trim().toLowerCase()}` : null) ||
    (record.cliente_email ? `email:${String(record.cliente_email).trim().toLowerCase()}` : null) ||
    (record.anonymous_id ? `anon:${record.anonymous_id}` : null) ||
    (record.metadata?.anonymousId ? `anon:${record.metadata.anonymousId}` : null)
  );
}

function formatPercent(value: number, base: number) {
  if (!base) return 0;
  return Number(((value / base) * 100).toFixed(2));
}

export async function getConversionDashboard(days = 30) {
  const db = createRequiredServerClient() as any;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: events },
    { data: abandonedCarts },
    { data: orders },
    { data: products },
    { data: tests },
    { data: assignments },
  ] = await Promise.all([
    db
      .from('marketing_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    db
      .from('abandoned_carts')
      .select('*')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false }),
    db
      .from('pedidos')
      .select('id, numero_pedido, total, itens, user_id, cliente_email, anonymous_id, status_pagamento, created_at')
      .eq('status_pagamento', 'approved')
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
    db
      .from('produtos')
      .select('id, nome, sku, slug')
      .eq('is_active', true),
    db
      .from('ab_tests')
      .select('id, key, name')
      .eq('status', 'ACTIVE'),
    db
      .from('ab_test_assignments')
      .select('*')
      .gte('last_exposed_at', since),
  ]);

  const eventRows = events || [];
  const orderRows = orders || [];
  const productMap = new Map<string, any>((products || []).map((product: any) => [product.id, product]));

  const stageSets = {
    visit: new Set<string>(),
    productView: new Set<string>(),
    addToCart: new Set<string>(),
    checkout: new Set<string>(),
    purchase: new Set<string>(),
  };

  const productPerformance = new Map<string, ProductInsight>();
  const checkoutFailures = {
    pixGenerated: 0,
    purchases: 0,
  };

  for (const event of eventRows) {
    const identity = identityFromRecord(event);
    if (!identity) continue;

    if (event.event_name === 'visit') stageSets.visit.add(identity);
    if (['product_view', 'view_item'].includes(event.event_name)) {
      stageSets.productView.add(identity);
      if (event.product_id) {
        const product = productMap.get(event.product_id);
        if (!product) continue;
        const current = productPerformance.get(event.product_id) || {
          productId: event.product_id,
          nome: product.nome,
          sku: product.sku,
          views: 0,
          addToCart: 0,
          purchases: 0,
          revenue: 0,
          conversionRate: 0,
          insight: '',
        };
        current.views += 1;
        productPerformance.set(event.product_id, current);
      }
    }

    if (event.event_name === 'add_to_cart') {
      stageSets.addToCart.add(identity);
      if (event.product_id) {
        const product = productMap.get(event.product_id);
        if (!product) continue;
        const current = productPerformance.get(event.product_id) || {
          productId: event.product_id,
          nome: product.nome,
          sku: product.sku,
          views: 0,
          addToCart: 0,
          purchases: 0,
          revenue: 0,
          conversionRate: 0,
          insight: '',
        };
        current.addToCart += 1;
        productPerformance.set(event.product_id, current);
      }
    }

    if (event.event_name === 'checkout_started') stageSets.checkout.add(identity);
    if (event.event_name === 'pix_generated') checkoutFailures.pixGenerated += 1;
  }

  for (const order of orderRows) {
    const identity = identityFromRecord(order);
    if (identity) {
      stageSets.purchase.add(identity);
      checkoutFailures.purchases += 1;
    }

    if (!Array.isArray(order.itens)) continue;
    for (const item of order.itens) {
      const productId = item.product_id || item.produto_id;
      if (!productId || !productMap.has(productId)) continue;

      const product = productMap.get(productId);
      const current = productPerformance.get(productId) || {
        productId,
        nome: product.nome,
        sku: product.sku,
        views: 0,
        addToCart: 0,
        purchases: 0,
        revenue: 0,
        conversionRate: 0,
        insight: '',
      };

      current.purchases += Number(item.quantity || item.quantidade || 1);
      current.revenue += Number(item.total_price || item.preco_total || 0);
      productPerformance.set(productId, current);
    }
  }

  const ticketMedio = orderRows.length
    ? orderRows.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0) / orderRows.length
    : 0;

  const productInsights = Array.from(productPerformance.values())
    .map((product) => {
      const conversionRate = formatPercent(product.purchases, product.views);
      let insight = 'Produto performando dentro do esperado.';

      if (product.views >= 30 && conversionRate < 2) {
        insight = 'Muitas visitas e poucas compras. Reforce prova social, oferta e CTA.';
      } else if (product.addToCart >= 10 && product.purchases < Math.max(2, product.addToCart * 0.25)) {
        insight = 'Boa intencao de compra, mas queda antes do fechamento. Revisar preco, urgencia e checkout.';
      } else if (conversionRate >= 5) {
        insight = 'Produto com boa conversao. Vale escalar em destaque e trafego.';
      }

      return {
        ...product,
        conversionRate,
        insight,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  const abandonedCount = (abandonedCarts || []).filter((cart: any) => cart.status === 'abandoned').length;
  const addToCartCount = stageSets.addToCart.size;
  const checkoutCount = stageSets.checkout.size;
  const purchaseCount = stageSets.purchase.size;
  const visitCount = stageSets.visit.size;
  const cartAbandonmentRate = formatPercent(abandonedCount, addToCartCount || 1);
  const checkoutFailureRate = checkoutFailures.pixGenerated
    ? Number((((checkoutFailures.pixGenerated - checkoutFailures.purchases) / checkoutFailures.pixGenerated) * 100).toFixed(2))
    : 0;

  const alerts: DashboardAlert[] = [];

  const weakProducts = productInsights.filter((product) => product.views >= 30 && product.conversionRate < 2).slice(0, 3);
  for (const product of weakProducts) {
    alerts.push({
      severity: 'high',
      title: `${product.nome} com muito trafego e pouca compra`,
      description: `${product.views} visitas para ${product.purchases} compras no periodo.`,
      action: 'Testar nova copy, reforco de valor e CTA mais forte.',
    });
  }

  if (addToCartCount >= 10 && cartAbandonmentRate >= 35) {
    alerts.push({
      severity: 'high',
      title: 'Abandono de carrinho elevado',
      description: `${cartAbandonmentRate}% do volume de carrinho caiu antes do pagamento.`,
      action: 'Priorizar remarketing por WhatsApp e revisar friccao do checkout.',
    });
  }

  if (checkoutFailures.pixGenerated >= 10 && checkoutFailureRate >= 40) {
    alerts.push({
      severity: 'medium',
      title: 'Queda forte entre Pix gerado e compra aprovada',
      description: `${checkoutFailureRate}% dos Pix gerados nao viraram compra aprovada.`,
      action: 'Reforcar confianca, instrucoes do Pix e urgencia no pagamento.',
    });
  }

  const purchaseIdentities = new Set(orderRows.map(identityFromRecord).filter(Boolean));
  const checkoutIdentities = new Set(
    eventRows
      .filter((event: any) => ['checkout_started', 'pix_generated'].includes(event.event_name))
      .map(identityFromRecord)
      .filter(Boolean),
  );

  const experimentResults: ExperimentResult[] = [];
  for (const assignment of assignments || []) {
    const test = (tests || []).find((item: any) => item.id === assignment.test_id);
    if (!test) continue;

    const existing = experimentResults.find(
      (item) => item.testKey === assignment.test_key && item.variantKey === assignment.variant_key,
    );

    const convertedCheckout = checkoutIdentities.has(assignment.identity_key);
    const convertedPurchase = purchaseIdentities.has(assignment.identity_key);

    if (existing) {
      existing.exposures += 1;
      existing.checkouts += convertedCheckout ? 1 : 0;
      existing.purchases += convertedPurchase ? 1 : 0;
      existing.checkoutRate = formatPercent(existing.checkouts, existing.exposures);
      existing.purchaseRate = formatPercent(existing.purchases, existing.exposures);
      continue;
    }

    experimentResults.push({
      testKey: assignment.test_key,
      testName: test.name,
      variantKey: assignment.variant_key,
      exposures: 1,
      checkouts: convertedCheckout ? 1 : 0,
      purchases: convertedPurchase ? 1 : 0,
      checkoutRate: formatPercent(convertedCheckout ? 1 : 0, 1),
      purchaseRate: formatPercent(convertedPurchase ? 1 : 0, 1),
    });
  }

  const orderEmails = orderRows
    .map((order: any) => String(order.cliente_email || '').trim().toLowerCase())
    .filter(Boolean);
  const recurringCustomers = (Object.values(
    orderEmails.reduce((acc: Record<string, number>, email: string) => {
      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {}),
  ) as number[]).filter((count) => count >= 2).length;

  return {
    periodDays: days,
    summary: {
      visits: visitCount,
      productViews: stageSets.productView.size,
      addToCart: addToCartCount,
      checkout: checkoutCount,
      purchases: purchaseCount,
      conversionRate: formatPercent(purchaseCount, visitCount || 1),
      ticketMedio,
      cartAbandonmentRate,
      checkoutFailureRate,
      abandonedCartsReady: abandonedCount,
      recurringCustomers,
    },
    funnel: [
      { label: 'Visita', value: visitCount },
      { label: 'Produto', value: stageSets.productView.size },
      { label: 'Carrinho', value: addToCartCount },
      { label: 'Checkout', value: checkoutCount },
      { label: 'Compra', value: purchaseCount },
    ],
    productInsights,
    alerts,
    experimentResults,
  };
}
