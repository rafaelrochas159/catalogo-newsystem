"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { generateOrderMessage, getWhatsAppLink, formatPrice } from '@/lib/utils';
import { COMPANY_INFO } from '@/lib/constants';

/**
 * Página "Minha conta" para clientes autenticados. Permite visualizar e editar
 * informações pessoais (nome, telefone, CPF/CNPJ) e endereço. Também exibe
 * link para consultar pedidos. Redireciona para login se o cliente não estiver
 * autenticado.
 */
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

export default function MyAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [saving, setSaving] = useState(false);

  // State for listing and updating orders
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersFetched, setOrdersFetched] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setClienteId(session.user.id);
      // Busca dados do cliente
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('nome, email, telefone, cpf_cnpj, endereco')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        if (data) {
          setNome(data.nome || '');
          setEmail(data.email || '');
          setTelefone(data.telefone || '');
          setCpfCnpj(data.cpf_cnpj || '');
          if (data.endereco) {
            setCep(data.endereco.cep || '');
            setRua(data.endereco.rua || '');
            setNumero(data.endereco.numero || '');
            setBairro(data.endereco.bairro || '');
            setCidade(data.endereco.cidade || '');
            setEstado(data.endereco.estado || '');
            setComplemento(data.endereco.complemento || '');
          }
        }
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('clientes') || message.includes('schema cache')) {
          console.warn('Tabela clientes não encontrada. Execute o script SQL para criá-la.', message);
          // continua com dados em branco
        } else {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
      // Após carregar dados do usuário, busca seus pedidos usando o email cadastrado
      if (session.user.email) {
        fetchOrdersByEmail(session.user.email);
      }
    }
    loadUser();
  }, [router]);

  /**
   * Busca pedidos pelo e-mail fornecido. Atualiza o estado orders
   * e lança uma atualização de status para que pagamentos recentes
   * sejam refletidos imediatamente.
   */
  const fetchOrdersByEmail = async (emailParam: string) => {
    setOrdersFetched(true);
    const cleanEmail = emailParam.trim().toLowerCase();
    if (!/.+@.+\..+/.test(cleanEmail)) {
      setOrdersError('E-mail inválido');
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const response = await fetch(`/api/pedidos/email/${encodeURIComponent(cleanEmail)}`, {
        headers: { 'Cache-Control': 'no-store' },
      });
      const json = await response.json();
      if (!response.ok) {
        setOrdersError(json.error || 'Erro ao buscar pedidos');
        setOrders([]);
      } else {
        const fetchedOrders = (json.data as OrderData[]) || [];
        setOrders(fetchedOrders);
        // Atualiza o status de cada pedido
        updateOrdersStatus(fetchedOrders);
      }
    } catch (err) {
      setOrdersError('Erro inesperado ao buscar pedidos');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  /**
   * Atualiza o status de todos os pedidos fornecidos. Para cada pedido que não
   * esteja aprovado, chama o endpoint `/api/payments/status/[numeroPedido]`
   * para sincronizar com o Mercado Pago e atualiza o banco. Em seguida,
   * atualiza o estado local com os novos status.
   */
  const updateOrdersStatus = async (currentOrders: OrderData[] = orders) => {
    if (!currentOrders || currentOrders.length === 0) return;
    try {
      setUpdatingStatus(true);
      const updated = await Promise.all(
        currentOrders.map(async (order) => {
          const isApproved =
            order.status_pagamento === 'approved' ||
            order.status_pedido === 'pago' ||
            order.status_pedido === 'confirmado';
          if (isApproved) return order;
          try {
            const res = await fetch(`/api/payments/status/${encodeURIComponent(order.numero_pedido)}`);
            const json = await res.json();
            if (res.ok && json.status_pagamento) {
              return {
                ...order,
                status_pagamento: json.status_pagamento as any,
                status_pedido: json.status_pedido as any,
              };
            }
          } catch (e) {
            // silenciosamente ignoramos erros
          }
          return order;
        }),
      );
      setOrders(updated);
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * Constrói e abre um link do WhatsApp para reenviar o pedido ao WhatsApp oficial
   * da empresa. Utiliza generateOrderMessage para montar a mensagem com itens,
   * resumo e endereço.
   */
  const sendOrderToWhatsApp = (order: OrderData) => {
    try {
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
      const message = generateOrderMessage({
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

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!clienteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          cpf_cnpj: cpfCnpj.trim() || null,
          endereco: {
            cep: cep.trim(),
            rua: rua.trim(),
            numero: numero.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            estado: estado.trim(),
            complemento: complemento.trim() || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteId);
      if (error) throw error;
      toast.success('Dados atualizados com sucesso.');
    } catch (error: any) {
      const message = error?.message || '';
      if (message.includes('clientes') || message.includes('schema cache')) {
        console.warn('Tabela clientes não encontrada. Execute o script SQL para criá-la.', message);
        toast.error('Funcionalidade indisponível: tabela de clientes não está criada.');
      } else {
        toast.error(message || 'Erro ao atualizar dados.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Minha conta</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
          <Input id="cpf_cnpj" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
        </div>
        <hr className="my-4" />
        <h2 className="text-xl font-semibold">Endereço</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="rua">Rua</Label>
            <Input id="rua" value={rua} onChange={(e) => setRua(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div className="col-span-1 space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
      </form>
      {/* Seção de pedidos do cliente */}
      <div className="pt-8 space-y-4">
        <h2 className="text-xl font-semibold">Meus pedidos</h2>
        {ordersLoading && <p>Carregando pedidos…</p>}
        {ordersError && <p className="text-sm text-red-500">{ordersError}</p>}
        {!ordersLoading && ordersFetched && orders.length === 0 && !ordersError && (
          <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
        )}
        {orders.length > 0 && (
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => updateOrdersStatus()} disabled={updatingStatus}>
              {updatingStatus ? 'Atualizando…' : 'Atualizar status'}
            </Button>
          </div>
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
    </div>
  );
}