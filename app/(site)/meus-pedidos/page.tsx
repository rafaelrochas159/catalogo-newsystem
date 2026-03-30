"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { ProductCard } from '@/components/product/ProductCard';
import { Produto } from '@/types';
import { generateProfessionalOrderMessage, getWhatsAppLink } from '@/lib/utils';
import { COMPANY_INFO } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';
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
  /** Forma de pagamento utilizada (pix, whatsapp, cartão etc.). Opcional. */
  forma_pagamento?: string | null;
  itens: OrderItem[];
  subtotal?: number;
  desconto_valor?: number;
  total: number;
  endereco?: OrderAddress | null;

  // Dados do cliente (opcionais)
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_cpf_cnpj?: string | null;
  tipo_catalogo?: 'UNITARIO' | 'CAIXA_FECHADA' | string;
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

  // Prefill the email field from query parameter or from localStorage. This
  // effect runs only on mount and improves the UX by remembering the
  // customer's last used email. It uses the browser's URLSearchParams to
  // avoid Next.js Suspense requirements for `useSearchParams()`.
  useEffect(() => {
    const loadInitialEmail = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const sessionEmail = session?.user?.email?.trim().toLowerCase();
        if (sessionEmail) {
          setEmail(sessionEmail);
          return;
        }

        if (typeof window !== 'undefined') {
          const storedLastOrder = localStorage.getItem('ns_last_order_number');
          if (storedLastOrder) {
            setLastOrderNumber(storedLastOrder);
          }
          const params = new URLSearchParams(window.location.search);
          const paramEmail = params.get('email');
          if (paramEmail) {
            setEmail(paramEmail);
            return;
          }
          const stored = localStorage.getItem('ns_last_email');
          if (stored) setEmail(stored);
        }
      } catch (e) {
        // ignore errors (e.g., SSR, storage access)
      }
    };

    loadInitialEmail();
  }, []);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [recommended, setRecommended] = useState<Produto[]>([]);
  // Estado de carregamento para produtos recomendados não é usado na interface,
  // por isso a variável é prefixada com underscore para evitar avisos de variável não utilizada.
  const [_loadingRecommended, setLoadingRecommended] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const autoLoadedRef = useRef(false);

  /**
   * Constrói e abre um link do WhatsApp para reenviar o pedido ao WhatsApp oficial da empresa.
   * Aceita um pedido e utiliza a função generateOrderMessage para construir uma
   * mensagem completa com itens, resumo e endereço. Caso algum dado
   * necessário esteja ausente, a função tenta inferir usando campos
   * alternativos e exibe uma notificação de erro se não conseguir.
   */
  const sendOrderToWhatsApp = (order: OrderData) => {
    try {
      // Converte os itens do pedido para o formato esperado por generateOrderMessage
      const itemsForMessage = order.itens.map((item) => {
        const name = (item.product_name || item.nome || 'Produto') as string;
        const sku = item.sku || '';
        const quantity = (item.quantity ?? item.quantidade ?? 0) as number;
        const unitPrice = (item.unit_price ?? item.preco_unitario ?? 0) as number;
        const totalPrice = (item.total_price ?? item.preco_total ?? 0) as number;
        return { name, sku, quantity, unitPrice, totalPrice };
      });
      const subtotalVal = order.subtotal ?? order.total;
      const discountVal = order.desconto_valor || 0;
      const totalVal = order.total;
      const catalogType = (order.tipo_catalogo ?? 'UNITARIO') as any;
      const message = generateProfessionalOrderMessage({
        orderNumber: order.numero_pedido,
        catalogType,
        items: itemsForMessage,
        subtotal: subtotalVal,
        discount: discountVal,
        total: totalVal,
        address: order.endereco as any,
        customer: {
          nome: (order.cliente_nome as any) || '',
          email: (order.cliente_email as any) || '',
          telefone: (order.cliente_telefone as any) || '',
          cpf_cnpj: (order.cliente_cpf_cnpj as any) || undefined,
        },
        paymentMethod: order.forma_pagamento || 'Pix',
      });
      const link = getWhatsAppLink(COMPANY_INFO.whatsapp, message);
      if (typeof window !== 'undefined') {
        window.location.href = link;
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Não foi possível gerar o link do WhatsApp.');
    }
  };

  const isEmailValid = () => {
    return /.+@.+\..+/.test(email.trim());
  };

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  };

  useEffect(() => {
    const autoLoadOrders = async () => {
      if (autoLoadedRef.current || !/.+@.+\..+/.test(email.trim())) {
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      autoLoadedRef.current = true;
      fetchOrdersByEmail();
    };

    autoLoadOrders();
  }, [email]);

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
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError('FaÃ§a login para consultar seus pedidos.');
        setOrders([]);
        return;
      }

      const response = await fetch(`/api/pedidos/email/${encodeURIComponent(email.trim())}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Erro ao buscar pedidos');
        setOrders([]);
      } else {
        const fetchedOrders = (json.data as OrderData[]) || [];
        setOrders(fetchedOrders);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ns_last_email', email.trim().toLowerCase());
          if (fetchedOrders[0]?.numero_pedido) {
            localStorage.setItem('ns_last_order_number', fetchedOrders[0].numero_pedido);
            setLastOrderNumber(fetchedOrders[0].numero_pedido);
          }
        }
        // Após buscar os pedidos, tenta atualizar o status de cada um deles.
        // Isso garante que um pagamento recentemente aprovado seja refletido imediatamente.
        updateOrdersStatus(fetchedOrders);
      }
    } catch (err) {
      setError('Erro inesperado ao buscar pedidos.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza o status de todos os pedidos fornecidos. Para cada pedido que não
   * tenha o status de pagamento aprovado, faz uma chamada ao endpoint
   * `/api/payments/status/[numeroPedido]` que sincroniza o status com o
   * Mercado Pago e atualiza o banco. Em seguida, atualiza o estado local
   * com os novos dados de status. Se nenhum pedido for fornecido, usa o
   * estado atual `orders`.
   */
  const updateOrdersStatus = async (currentOrders: OrderData[] = orders) => {
    if (!currentOrders || currentOrders.length === 0) return;
    try {
      setUpdatingStatus(true);
      const accessToken = await getAccessToken();
      const updated = await Promise.all(
        currentOrders.map(async (order) => {
          // Se já estiver aprovado/pago, não precisa atualizar
          const isApproved =
            order.status_pagamento === 'approved' ||
            order.status_pedido === 'pago' ||
            order.status_pedido === 'confirmado';
          if (isApproved) return order;
          try {
            const reference = order.checkout_token || order.numero_pedido;
            const res = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, {
              headers: !order.checkout_token && accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : undefined,
            });
            const json = await res.json();
            if (res.ok && json.status_pagamento) {
              return {
                ...order,
                status_pagamento: json.status_pagamento as any,
                status_pedido: json.status_pedido as any,
              };
            }
          } catch (e) {
            // ignore errors silently
          }
          return order;
        }),
      );
      setOrders(updated);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Busca produtos recomendados para exibir no topo da página. É executado
  // apenas uma vez no carregamento do componente.
  useEffect(() => {
    async function fetchRecommended() {
      try {
        setLoadingRecommended(true);
        const accessToken = await getAccessToken();
        const res = await fetch('/api/recommendations', {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        });
        const json = await res.json();
        if (res.ok) {
          setRecommended((json.data as Produto[]) || []);
        }
      } catch (e) {
        // ignore errors
      } finally {
        setLoadingRecommended(false);
      }
    }
    fetchRecommended();
  }, []);

  const latestOrder =
    orders.find((order) => order.numero_pedido === lastOrderNumber) ||
    orders[0] ||
    null;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Meus Pedidos</h1>

      {latestOrder && (
        <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-blue">
                Ultimo pedido
              </p>
              <h2 className="text-xl font-bold mt-1">{latestOrder.numero_pedido}</h2>
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
            <span className="text-muted-foreground">Total do ultimo acesso salvo</span>
            <span className="text-lg font-bold text-neon-blue">{formatPrice(latestOrder.total)}</span>
          </div>
        </section>
      )}

      {/* Seção de produtos recomendados */}
      {recommended.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span role="img" aria-label="fogo">🔥</span> Aproveite e compre mais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommended.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
                catalogType={product.tipo_catalogo === 'CAIXA_FECHADA' ? 'CAIXA_FECHADA' : 'UNITARIO'}
              />
            ))}
          </div>
        </section>
      )}
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
      {/* Botão manual para atualizar o status dos pedidos */}
      {orders.length > 0 && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => updateOrdersStatus()}
            disabled={updatingStatus}
          >
            {updatingStatus ? 'Atualizando...' : 'Atualizar status'}
          </Button>
        </div>
      )}
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
                {(order.status_pagamento === 'approved' || order.status_pedido === 'pago' || order.status_pedido === 'confirmado') && (
                  <p className="mt-2 text-sm font-medium text-green-600 flex items-center gap-1">
                    ✅ Pagamento aprovado
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
                {(order.status_pagamento === 'approved' || order.status_pedido === 'pago' || order.status_pedido === 'confirmado') && (
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
    </div>
  );
}
