"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductCard } from '@/components/product/ProductCard';
import { authorizedFetch } from '@/lib/client-auth';
import { COMPANY_INFO } from '@/lib/constants';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';
import { supabase } from '@/lib/supabase/client';
import { formatPrice, generateProfessionalOrderMessage, getWhatsAppLink } from '@/lib/utils';
import { Produto } from '@/types';
import { Loader2, PackageSearch, RefreshCcw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

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
  checkout_token?: string | null;
  created_at: string;
  status_pedido?: string | null;
  status_pagamento?: string | null;
  forma_pagamento?: string | null;
  itens: OrderItem[];
  subtotal?: number;
  desconto_valor?: number;
  total: number;
  endereco?: OrderAddress | null;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_cpf_cnpj?: string | null;
  tipo_catalogo?: 'UNITARIO' | 'CAIXA_FECHADA' | string;
}

interface AccountPayload {
  profile?: {
    nome?: string | null;
    email?: string | null;
  } | null;
  orders?: OrderData[];
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
      return <Badge variant="secondary">{status || '---'}</Badge>;
  }
}

function orderStatusBadge(status?: string | null) {
  switch (status) {
    case 'pago':
    case 'confirmado':
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
      return <Badge variant="secondary">{status || '---'}</Badge>;
  }
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [recommended, setRecommended] = useState<Produto[]>([]);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  const sendOrderToWhatsApp = useCallback((order: OrderData) => {
    try {
      const itemsForMessage = order.itens.map((item) => ({
        name: (item.product_name || item.nome || 'Produto') as string,
        sku: item.sku || '',
        quantity: Number(item.quantity ?? item.quantidade ?? 0),
        unitPrice: Number(item.unit_price ?? item.preco_unitario ?? 0),
        totalPrice: Number(item.total_price ?? item.preco_total ?? 0),
      }));

      const message = generateProfessionalOrderMessage({
        orderNumber: order.numero_pedido,
        catalogType: (order.tipo_catalogo ?? 'UNITARIO') as any,
        items: itemsForMessage,
        subtotal: order.subtotal ?? order.total,
        discount: order.desconto_valor || 0,
        total: order.total,
        address: order.endereco as any,
        customer: {
          nome: order.cliente_nome || '',
          email: order.cliente_email || '',
          telefone: order.cliente_telefone || '',
          cpf_cnpj: order.cliente_cpf_cnpj || undefined,
        },
        paymentMethod: order.forma_pagamento || 'Pix',
      });

      window.location.href = getWhatsAppLink(COMPANY_INFO.whatsapp, message);
    } catch (error) {
      console.error(error);
      toast.error('Nao foi possivel gerar o link do WhatsApp.');
    }
  }, []);

  const updateOrdersStatus = useCallback(async (currentOrders: OrderData[]) => {
    if (!currentOrders.length) {
      return;
    }

    try {
      setUpdatingStatus(true);

      const updatedOrders = await Promise.all(
        currentOrders.map(async (order) => {
          const isFinalized =
            order.status_pagamento === 'approved' ||
            order.status_pedido === 'pago' ||
            order.status_pedido === 'confirmado';

          if (isFinalized) {
            return order;
          }

          const reference = order.checkout_token || order.numero_pedido;

          try {
            const response = await authorizedFetch(
              `/api/payments/status/${encodeURIComponent(reference)}`,
              { cache: 'no-store' }
            );
            const json = await readJsonSafely<{
              status_pagamento?: string;
              status_pedido?: string;
            }>(response);

            if (!response.ok || !json) {
              return order;
            }

            return {
              ...order,
              status_pagamento: json.status_pagamento || order.status_pagamento,
              status_pedido: json.status_pedido || order.status_pedido,
            };
          } catch {
            return order;
          }
        })
      );

      setOrders(updatedOrders);
    } finally {
      setUpdatingStatus(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace('/login');
        return;
      }

      const response = await authorizedFetch('/api/account', {
        cache: 'no-store',
      });
      const json = await readJsonSafely<{ data?: AccountPayload; error?: string }>(response);

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        throw new Error(
          getResponseErrorMessage(response, json, 'Nao foi possivel carregar seus pedidos.')
        );
      }

      const fetchedOrders = Array.isArray(json?.data?.orders) ? json.data.orders : [];
      const normalizedOrders = [...fetchedOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(normalizedOrders);
      setAccountEmail(
        json?.data?.profile?.email?.trim().toLowerCase() ||
        session.user.email?.trim().toLowerCase() ||
        null
      );

      const storedLastOrder =
        typeof window !== 'undefined' ? window.localStorage.getItem('ns_last_order_number') : null;

      if (storedLastOrder) {
        setLastOrderNumber(storedLastOrder);
      } else if (normalizedOrders[0]?.numero_pedido && typeof window !== 'undefined') {
        window.localStorage.setItem('ns_last_order_number', normalizedOrders[0].numero_pedido);
        setLastOrderNumber(normalizedOrders[0].numero_pedido);
      }

      await updateOrdersStatus(normalizedOrders);
    } catch (loadError: any) {
      setOrders([]);
      setError(loadError?.message || 'Nao foi possivel carregar seus pedidos.');
    } finally {
      setLoadingOrders(false);
    }
  }, [router, updateOrdersStatus]);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoadingRecommended(true);
      const response = await authorizedFetch('/api/recommendations/ai?context=orders&limit=8', {
        cache: 'no-store',
      });
      const json = await readJsonSafely<{ data?: Produto[] }>(response);

      if (!response.ok) {
        setRecommended([]);
        return;
      }

      setRecommended(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setRecommended([]);
    } finally {
      setLoadingRecommended(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    void loadRecommendations();
  }, [loadOrders, loadRecommendations]);

  const latestOrder = useMemo(
    () =>
      orders.find((order) => order.numero_pedido === lastOrderNumber) ||
      orders[0] ||
      null,
    [lastOrderNumber, orders]
  );

  if (loadingOrders) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="rounded-[28px] border border-neon-blue/15 bg-card/70 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-neon-blue">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="font-medium">Carregando seus pedidos com sessao autenticada...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 rounded-[32px] border border-neon-blue/15 bg-gradient-to-br from-card via-card to-neon-blue/5 p-6 shadow-[0_30px_100px_rgba(0,243,255,0.08)] sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-blue/20 bg-neon-blue/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acesso seguro
          </div>
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Meus pedidos</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Seus pedidos agora ficam disponiveis apenas com sessao valida. Nada de consulta por e-mail solto.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {accountEmail ? `Conta vinculada: ${accountEmail}` : 'Conta autenticada ativa'}
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadOrders()} disabled={loadingOrders || updatingStatus}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loadingOrders || updatingStatus ? 'animate-spin' : ''}`} />
          Atualizar pedidos
        </Button>
      </div>

      {latestOrder && (
        <section className="mt-6 rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-blue">
                Ultimo pedido acessado
              </p>
              <h2 className="mt-1 text-xl font-bold">{latestOrder.numero_pedido}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(latestOrder.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {orderStatusBadge(latestOrder.status_pedido)}
              {paymentStatusBadge(latestOrder.status_pagamento)}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total salvo para retorno rapido</span>
            <span className="text-lg font-bold text-neon-blue">{formatPrice(latestOrder.total)}</span>
          </div>
        </section>
      )}

      <section className="mt-8 rounded-[28px] border border-neon-blue/15 bg-card/70 p-5">
        <div className="mb-4 flex items-center gap-2">
          <span role="img" aria-label="fogo">🔥</span>
          <div>
            <h2 className="text-2xl font-bold">Recomendado para a sua recompra</h2>
            <p className="text-sm text-muted-foreground">
              Sugestoes aparecem aqui com base no seu historico autenticado de compra.
            </p>
          </div>
        </div>

        {loadingRecommended ? (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            Carregando recomendacoes...
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommended.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
                catalogType={product.tipo_catalogo === 'CAIXA_FECHADA' ? 'CAIXA_FECHADA' : 'UNITARIO'}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            Assim que houver historico suficiente ou produtos mais aderentes, as sugestoes personalizadas aparecerao aqui.
          </div>
        )}
      </section>

      {error && (
        <Card className="mt-6 border-red-500/20">
          <CardHeader>
            <CardTitle>Falha ao carregar pedidos</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void loadOrders()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && orders.length === 0 && (
        <Card className="mt-6 border-dashed border-neon-blue/20">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <PackageSearch className="h-10 w-10 text-neon-blue" />
            <p className="text-lg font-semibold">Nenhum pedido encontrado na sua conta</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Assim que voce concluir uma compra autenticada, o historico aparecera aqui automaticamente.
            </p>
            <Button className="bg-neon-blue text-black hover:bg-neon-blue/90" onClick={() => router.push('/catalogo/unitario')}>
              Ver produtos
            </Button>
          </CardContent>
        </Card>
      )}

      {orders.length > 0 && (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const createdAt = new Date(order.created_at);
            const isApproved =
              order.status_pagamento === 'approved' ||
              order.status_pedido === 'pago' ||
              order.status_pedido === 'confirmado';

            return (
              <Card key={order.id} className="border">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                    <span>Pedido {order.numero_pedido}</span>
                    <span className="text-sm text-muted-foreground">
                      {createdAt.toLocaleDateString('pt-BR')} as{' '}
                      {createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-2 flex flex-wrap gap-4">
                    <span>Status do pedido: {orderStatusBadge(order.status_pedido)}</span>
                    <span>Status do pagamento: {paymentStatusBadge(order.status_pagamento)}</span>
                    {order.forma_pagamento && (
                      <span>
                        Forma de pagamento: <Badge variant="secondary">{order.forma_pagamento}</Badge>
                      </span>
                    )}
                  </CardDescription>
                  {isApproved && (
                    <p className="mt-2 flex items-center gap-1 text-sm font-medium text-green-600">
                      Pagamento aprovado
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/12">Qtd</TableHead>
                          <TableHead className="w-4/12">Produto</TableHead>
                          <TableHead className="w-2/12">SKU</TableHead>
                          <TableHead className="w-2/12 text-right">Unitario</TableHead>
                          <TableHead className="w-2/12 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.itens.map((item, index) => {
                          const name = item.product_name || item.nome || 'Produto';
                          const sku = item.sku || '';
                          const quantity = item.quantity ?? item.quantidade ?? 0;
                          const unitPrice = item.unit_price ?? item.preco_unitario ?? 0;
                          const totalPrice = item.total_price ?? item.preco_total ?? 0;

                          return (
                            <TableRow key={`${order.id}-${index}`}>
                              <TableCell>{quantity}</TableCell>
                              <TableCell>{name}</TableCell>
                              <TableCell>{sku}</TableCell>
                              <TableCell className="text-right">{formatPrice(Number(unitPrice))}</TableCell>
                              <TableCell className="text-right">{formatPrice(Number(totalPrice))}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-1 text-sm">
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
                    <div className="space-y-1 border-t pt-2 text-sm">
                      <p className="font-medium">Endereco de entrega</p>
                      <p>CEP: {order.endereco.cep}</p>
                      <p>
                        {order.endereco.rua}, {order.endereco.numero}
                      </p>
                      <p>{order.endereco.bairro}</p>
                      <p>
                        {order.endereco.cidade} - {order.endereco.estado}
                      </p>
                      {order.endereco.complemento && <p>{order.endereco.complemento}</p>}
                    </div>
                  )}

                  {isApproved && (
                    <div className="pt-3">
                      <Button variant="outline" onClick={() => sendOrderToWhatsApp(order)}>
                        Enviar pedido para WhatsApp
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
