"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Trash2, Copy, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { Pedido } from '@/types';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

function statusBadge(label: string, variant: 'default' | 'secondary' | 'destructive' = 'secondary') {
  return <Badge variant={variant}>{label}</Badge>;
}

function paymentStatusBadge(status?: string | null) {
  switch (status) {
    case 'approved': return statusBadge('Aprovado', 'default');
    case 'pending':
    case 'in_process': return statusBadge('Aguardando', 'secondary');
    case 'rejected':
    case 'cancelled': return statusBadge('Recusado', 'destructive');
    case 'not_applicable': return statusBadge('Sem gateway', 'secondary');
    default: return statusBadge(status || '—', 'secondary');
  }
}

function orderStatusBadge(status?: string | null) {
  switch (status) {
    case 'pago': return statusBadge('Pago', 'default');
    case 'aguardando_pagamento': return statusBadge('Aguardando pagamento', 'secondary');
    case 'aguardando_contato': return statusBadge('Aguardando contato', 'secondary');
    case 'cancelado': return statusBadge('Cancelado', 'destructive');
    case 'erro_pagamento': return statusBadge('Erro no pagamento', 'destructive');
    default: return statusBadge(status || '—', 'secondary');
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Pedido[]) || []);
    } catch (error) {
      toast.error('Erro ao carregar pedidos.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const { error } = await supabase.from('pedidos').delete().eq('id', orderId);
      if (error) throw error;
      toast.success('Pedido excluído.');
      setOrders((prev) => prev.filter((item) => item.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pedido.');
    }
  }

  async function copyValue(value?: string | null, label = 'Valor') {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pedidos</h1>
            <p className="text-muted-foreground">Acompanhe pedido, pagamento, Pix e gateway do Mercado Pago.</p>
          </div>
          <Button variant="outline" onClick={fetchOrders}><RefreshCcw className="h-4 w-4 mr-2" />Atualizar</Button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Gateway ID</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Nenhum pedido encontrado.</TableCell></TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.numero_pedido}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{order.cliente_nome || '—'}</div>
                          <div className="text-muted-foreground">{order.cliente_email || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-neon-blue">{formatPrice(order.total)}</TableCell>
                      <TableCell>{orderStatusBadge(order.status_pedido || order.status)}</TableCell>
                      <TableCell>{paymentStatusBadge(order.status_pagamento)}</TableCell>
                      <TableCell>{order.forma_pagamento || '—'}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{order.payment_id_gateway || '—'}</TableCell>
                      <TableCell>{order.paid_at ? new Date(order.paid_at).toLocaleString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.numero_pedido}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.cliente_nome || '—'}</p>
                  <p>{selectedOrder.cliente_email || '—'}</p>
                  <p>{selectedOrder.cliente_telefone || '—'}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-muted-foreground">Pagamento</p>
                  <div className="flex flex-wrap gap-2">
                    {orderStatusBadge(selectedOrder.status_pedido || selectedOrder.status)}
                    {paymentStatusBadge(selectedOrder.status_pagamento)}
                  </div>
                  <p>Forma: <strong>{selectedOrder.forma_pagamento || '—'}</strong></p>
                  <p>Gateway: <strong>{selectedOrder.gateway || '—'}</strong></p>
                  <p>Payment ID: <strong>{selectedOrder.payment_id_gateway || '—'}</strong></p>
                  <p>External Ref: <strong>{selectedOrder.external_reference || '—'}</strong></p>
                  {selectedOrder.paid_at && <p>Pago em: <strong>{new Date(selectedOrder.paid_at).toLocaleString('pt-BR')}</strong></p>}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Itens do pedido</p>
                  <Badge variant="outline">{selectedOrder.itens?.reduce((acc, item) => acc + Number(item.quantity || 0), 0)} itens</Badge>
                </div>
                <div className="space-y-2">
                  {selectedOrder.itens?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg gap-3">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-muted-foreground">SKU: {item.sku} • {item.quantity}x {formatPrice(item.unit_price)}</p>
                      </div>
                      <p className="font-bold text-neon-blue">{formatPrice(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span>Desconto</span><span>{selectedOrder.desconto_valor ? `-${formatPrice(selectedOrder.desconto_valor)}` : '—'}</span></div>
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-neon-blue">{formatPrice(selectedOrder.total)}</span></div>
              </div>

              {selectedOrder.pix_copia_cola && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">Pix copia e cola</p>
                    <Button variant="outline" size="sm" onClick={() => copyValue(selectedOrder.pix_copia_cola, 'Pix')}><Copy className="h-4 w-4 mr-2" />Copiar</Button>
                  </div>
                  <div className="text-xs break-all bg-muted rounded-lg p-3">{selectedOrder.pix_copia_cola}</div>
                </div>
              )}

              {selectedOrder.pix_qr_code && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium">QR Code Pix</p>
                  <div className="bg-white rounded-xl p-4 max-w-sm">
                    <img src={`data:image/png;base64,${selectedOrder.pix_qr_code}`} alt="QR Code Pix" className="w-full" />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
