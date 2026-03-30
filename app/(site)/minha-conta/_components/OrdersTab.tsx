'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

function paymentVariant(status?: string | null) {
  if (status === 'approved') return 'default';
  if (status === 'pending' || status === 'in_process') return 'secondary';
  if (status === 'rejected' || status === 'cancelled' || status === 'error') return 'destructive';
  return 'outline';
}

export function OrdersTab({ orders }: { orders: any[]; profile: any; addresses: any[] }) {
  if (orders.length === 0) {
    return (
      <Card className="border-dashed border-neon-blue/20">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-lg font-semibold">Nenhum pedido encontrado</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Assim que voce concluir uma compra, seus pedidos aparecerao aqui com status, Pix e historico completo.
          </p>
          <Button variant="outline" onClick={() => { window.location.href = '/catalogo/unitario'; }}>
            Ver produtos
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="border-neon-blue/15 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Pedido</p>
                <h3 className="mt-1 text-xl font-bold">{order.numero_pedido}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={paymentVariant(order.status_pagamento) as any}>
                  Pagamento: {order.status_pagamento || 'aguardando'}
                </Badge>
                <Badge variant="outline">
                  Status: {order.fulfillment_status || order.status_pedido || 'aguardando_pagamento'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                <p className="mt-2 text-2xl font-bold text-neon-blue">{formatPrice(Number(order.total || order.subtotal || 0))}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pagamento</p>
                <p className="mt-2 font-medium">{order.forma_pagamento || 'Pix'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cliente</p>
                <p className="mt-2 font-medium">{order.cliente_email || 'Email nao informado'}</p>
              </div>
            </div>

            {order.pix_copia_cola && (
              <div className="rounded-2xl border border-neon-blue/20 bg-neon-blue/5 p-4 text-sm">
                <p className="font-semibold text-neon-blue">Pix copia e cola</p>
                <p className="mt-2 break-all text-muted-foreground">{order.pix_copia_cola}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {order.pix_copia_cola && (
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(order.pix_copia_cola)}>
                  Copiar Pix
                </Button>
              )}
              <Button variant="outline" onClick={() => { window.location.href = `/meus-pedidos?email=${encodeURIComponent(order.cliente_email || '')}`; }}>
                Ver detalhes completos
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

