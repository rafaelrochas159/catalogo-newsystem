'use client';

import { Button } from '@/components/ui/button';

export function OrdersTab({ orders }: { orders: any[]; profile: any; addresses: any[] }) {
  return (
    <div className="space-y-4">
      {orders.length === 0 && <div className="text-muted-foreground">Nenhum pedido encontrado.</div>}
      {orders.map((order) => (
        <div key={order.id} className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold">Pedido {order.numero_pedido}</div>
              <div className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString('pt-BR')}</div>
            </div>
            <div className="text-sm">Pagamento: <strong>{order.status_pagamento || '—'}</strong></div>
          </div>
          <div className="text-sm">Status: <strong>{order.fulfillment_status || order.status_pedido || 'aguardando_pagamento'}</strong></div>
          {order.pix_copia_cola && <div className="text-xs break-all bg-muted p-3 rounded-lg">{order.pix_copia_cola}</div>}
          <div className="flex gap-2 flex-wrap">
            {order.pix_copia_cola && <Button variant="outline" onClick={() => navigator.clipboard.writeText(order.pix_copia_cola)}>Copiar Pix</Button>}
            {(order.status_pagamento === 'approved' || order.status_pedido === 'pago') && <Button onClick={() => window.location.href = `/meus-pedidos?email=${encodeURIComponent(order.cliente_email || '')}`}>Enviar pedido para WhatsApp</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
