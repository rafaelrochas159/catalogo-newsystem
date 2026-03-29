"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';

interface OrderItem {
  product_name?: string;
  nome?: string;
  sku?: string;
  quantity?: number;
  quantidade?: number;
  unit_price?: number;
  preco_unitario?: number;
  total_price?: number;
  preco_total?: number;
}

interface OrderAddress {
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string | null;
}

interface OrderData {
  id: string;
  numero_pedido: string;
  created_at: string;
  status_pedido?: string | null;
  status_pagamento?: string | null;
  forma_pagamento?: string | null;
  itens: OrderItem[];
  subtotal?: number;
  desconto_valor?: number;
  total: number;
  endereco?: OrderAddress | null;
}

function paymentStatusBadge(status?: string | null) {
  switch (status) {
    case 'approved':
      return <Badge variant="default">Aprovado</Badge>;
    case 'pending':
    case 'in_process':
      return <Badge variant="secondary">Aguardando</Badge>;
    case 'rejected':
    case 'cancelled':
    case 'error':
      return <Badge variant="destructive">Recusado</Badge>;
    case 'not_applicable':
      return <Badge variant="secondary">Sem gateway</Badge>;
    default:
      return <Badge variant="secondary">{status || '—'}</Badge>;
  }
}

function orderStatusBadge(status?: string | null) {
  switch (status) {
    case 'pago':
      return <Badge variant="default">Pago</Badge>;
    case 'aguardando_pagamento':
      return <Badge variant="secondary">Aguardando pagamento</Badge>;
    case 'aguardando_contato':
      return <Badge variant="secondary">Aguardando contato</Badge>;
    case 'cancelado':
      return <Badge variant="destructive">Cancelado</Badge>;
    case 'erro_pagamento':
      return <Badge variant="destructive">Erro no pagamento</Badge>;
    default:
      return <Badge variant="secondary">{status || '—'}</Badge>;
  }
}

export default function MyOrdersPage() {
  const [email, setEmail] = useState('');
  const searchParams = useSearchParams();

  // Prefill the email field from query parameter or from localStorage. This
  // effect runs only on mount and improves the UX by remembering the
  // customer's last used email. It does not interfere with manual input.
  useEffect(() => {
    const paramEmail = searchParams.get('email');
    if (paramEmail) {
      setEmail(paramEmail);
    } else {
      try {
        const stored = localStorage.getItem('ns_last_email');
        if (stored) setEmail(stored);
      } catch (e) {
        // ignore storage errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const isEmailValid = () => {
    return /.+@.+\..+/.test(email.trim());
  };

  const fetchOrdersByEmail = async () => {
    setSearched(true);
    if (!isEmailValid()) {
      setError('Digite um e‑mail válido.');
      setOrders([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pedidos/email/${encodeURIComponent(email.trim())}`);
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Erro ao buscar pedidos');
        setOrders([]);
      } else {
        setOrders((json.data as OrderData[]) || []);
      }
    } catch (err) {
      setError('Erro inesperado ao buscar pedidos.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Meus Pedidos</h1>
      <div className="space-y-2 mb-6">
        <Label htmlFor="email">E‑mail utilizado na compra</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="email"
            type="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={fetchOrdersByEmail} disabled={!email || loading} className="shrink-0 bg-neon-blue text-black hover:bg-neon-blue/90">
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      {searched && !loading && orders.length === 0 && !error && (
        <p className="text-muted-foreground">Nenhum pedido encontrado para o e‑mail informado.</p>
      )}
      <div className="space-y-4">
        {orders.map((order) => {
          const createdAt = new Date(order.created_at);
          const dateStr = createdAt.toLocaleDateString('pt-BR');
          const timeStr = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return (
            <Card key={order.id} className="border">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 justify-between">
                  <span>Pedido {order.numero_pedido}</span>
                  <span className="text-sm text-muted-foreground">{dateStr} às {timeStr}</span>
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-4 mt-2">
                  <span>
                    Status do pedido: {orderStatusBadge(order.status_pedido)}
                  </span>
                  <span>
                    Status do pagamento: {paymentStatusBadge(order.status_pagamento)}
                  </span>
                  {order.forma_pagamento && (
                    <span>
                      Forma de pagamento: <Badge variant="secondary">{order.forma_pagamento}</Badge>
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/12">Qtd</TableHead>
                        <TableHead className="w-4/12">Produto</TableHead>
                        <TableHead className="w-2/12">SKU</TableHead>
                        <TableHead className="w-2/12 text-right">Unitário</TableHead>
                        <TableHead className="w-2/12 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.itens.map((item, idx) => {
                        const name = item.product_name || (item.nome as string) || 'Produto';
                        const sku = item.sku || '';
                        const qty = item.quantity ?? item.quantidade ?? 0;
                        const unit = item.unit_price ?? item.preco_unitario ?? 0;
                        const total = item.total_price ?? item.preco_total ?? 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell>{qty}</TableCell>
                            <TableCell>{name}</TableCell>
                            <TableCell>{sku}</TableCell>
                            <TableCell className="text-right">{formatPrice(unit)}</TableCell>
                            <TableCell className="text-right">{formatPrice(total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Subtotal:</strong> {formatPrice(order.subtotal ?? order.total)}
                  </p>
                  {order.desconto_valor && order.desconto_valor > 0 && (
                    <p>
                      <strong>Desconto:</strong> -{formatPrice(order.desconto_valor)}
                    </p>
                  )}
                  <p>
                    <strong>Total:</strong> {formatPrice(order.total)}
                  </p>
                </div>
                {order.endereco && (
                  <div className="text-sm space-y-1 border-t pt-2">
                    <p className="font-medium">Endereço de entrega:</p>
                    <p>📮 CEP: {order.endereco.cep}</p>
                    <p>📍 {order.endereco.rua}, {order.endereco.numero}</p>
                    <p>🏘️ {order.endereco.bairro}</p>
                    <p>🌆 {order.endereco.cidade} - {order.endereco.estado}</p>
                    {order.endereco.complemento && <p>📝 {order.endereco.complemento}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}