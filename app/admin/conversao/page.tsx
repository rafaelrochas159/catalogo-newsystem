import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Beaker, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireAdminPage } from '@/lib/auth/server';
import { getConversionDashboard } from '@/lib/conversion-intelligence';
import { formatPrice } from '@/lib/utils';

function severityVariant(severity: 'high' | 'medium' | 'low') {
  if (severity === 'high') return 'destructive';
  if (severity === 'medium') return 'secondary';
  return 'outline';
}

export default async function ConversionDashboardPage() {
  await requireAdminPage();
  const dashboard = await getConversionDashboard(30);

  const statCards = [
    {
      title: 'Conversao total',
      value: `${dashboard.summary.conversionRate.toFixed(2)}%`,
      subtitle: `${dashboard.summary.purchases} compras em ${dashboard.summary.visits} visitas`,
    },
    {
      title: 'Ticket medio',
      value: formatPrice(dashboard.summary.ticketMedio),
      subtitle: 'Pedidos aprovados nos ultimos 30 dias',
    },
    {
      title: 'Abandono de carrinho',
      value: `${dashboard.summary.cartAbandonmentRate.toFixed(2)}%`,
      subtitle: `${dashboard.summary.abandonedCartsReady} carrinhos prontos para remarketing`,
    },
    {
      title: 'Falha no checkout',
      value: `${dashboard.summary.checkoutFailureRate.toFixed(2)}%`,
      subtitle: 'Queda entre Pix gerado e compra aprovada',
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Conversao</h1>
        <p className="text-muted-foreground mt-2">
          Leitura operacional dos ultimos {dashboard.periodDays} dias para CRO, funil e trafego pago.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Funil completo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.funnel.map((step, index) => {
              const base = dashboard.funnel[0]?.value || 1;
              const percentage = Math.max((step.value / base) * 100, 6);
              return (
                <div key={step.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{index + 1}. {step.label}</span>
                    <span className="text-muted-foreground">{step.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted">
                    <div className="h-3 rounded-full bg-neon-blue" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas automaticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem gargalos criticos detectados agora.</p>
            ) : (
              dashboard.alerts.map((alert) => (
                <div key={alert.title} className="rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <Badge variant={severityVariant(alert.severity) as any}>{alert.severity}</Badge>
                  </div>
                  <p className="mt-3 font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  <p className="mt-2 text-sm">{alert.action}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Conversao por produto</CardTitle>
            <Link href="/admin/produtos">
              <Button variant="outline" size="sm">Ver catalogo</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.productInsights.slice(0, 8).map((product) => (
              <div key={product.productId} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{product.nome}</p>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <Badge variant={product.conversionRate >= 5 ? 'default' : product.conversionRate >= 2 ? 'secondary' : 'outline'}>
                    {product.conversionRate.toFixed(2)}%
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                  <p>Visitas: <strong>{product.views}</strong></p>
                  <p>Carrinho: <strong>{product.addToCart}</strong></p>
                  <p>Compras: <strong>{product.purchases}</strong></p>
                  <p>Receita: <strong>{formatPrice(product.revenue)}</strong></p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{product.insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remarketing ativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Carrinhos abandonados prontos</p>
              <p className="mt-2 text-3xl font-bold">{dashboard.summary.abandonedCartsReady}</p>
              <p className="mt-2 text-sm text-muted-foreground">Base pronta para WhatsApp sem disparo massivo.</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Clientes recorrentes</p>
              <p className="mt-2 text-3xl font-bold">{dashboard.summary.recurringCustomers}</p>
              <p className="mt-2 text-sm text-muted-foreground">Segmento pronto para oferta de recompra e cupom.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-neon-blue" />
            Base de A/B test
          </CardTitle>
          <Badge variant="outline">Medicao por exposicao e conversao</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.experimentResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">As variantes vao aparecer aqui conforme o trafego entrar.</p>
          ) : (
            dashboard.experimentResults.map((result) => (
              <div key={`${result.testKey}-${result.variantKey}`} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{result.testName}</p>
                    <p className="text-xs text-muted-foreground">Variante: {result.variantKey}</p>
                  </div>
                  <Badge variant="secondary">{result.exposures} exposicoes</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                  <p>Checkout: <strong>{result.checkouts}</strong></p>
                  <p>Compra: <strong>{result.purchases}</strong></p>
                  <p>Taxa checkout: <strong>{result.checkoutRate.toFixed(2)}%</strong></p>
                  <p>Taxa compra: <strong>{result.purchaseRate.toFixed(2)}%</strong></p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/produtos/novo">
          <Button className="bg-neon-blue text-black hover:bg-neon-blue/90">
            <Package className="mr-2 h-4 w-4" />
            Novo produto
          </Button>
        </Link>
        <Link href="/admin/produtos">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Ajustar conversao dos produtos
          </Button>
        </Link>
        <Link href="/admin/pedidos">
          <Button variant="outline">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ver pedidos
          </Button>
        </Link>
        <Link href="/admin/importar">
          <Button variant="outline">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Importar planilha
          </Button>
        </Link>
      </div>
    </div>
  );
}
