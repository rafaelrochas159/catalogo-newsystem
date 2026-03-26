"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { Pedido } from '@/types';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Pedido[] || []);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?\n\nEsta ação não pode ser desfeita.')) {
      return;
    }

    try {
      console.log('Tentando excluir pedido:', orderId);
      
      // Tentar excluir
      const { data, error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('Erro Supabase ao excluir:', error);
        toast.error(`Erro ao excluir: ${error.message}`);
        return;
      }

      console.log('Resposta da exclusão:', data);
      
      if (!data || data.length === 0) {
        console.warn('Nenhum pedido foi excluído - verifique as políticas do Supabase');
        toast.error('Pedido não pôde ser excluído. Verifique as permissões no Supabase.');
        return;
      }

      console.log('Pedido excluído com sucesso:', data);
      toast.success('Pedido excluído com sucesso!');
      
      // Atualiza a lista removendo o pedido localmente
      setOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Se o pedido excluído estava selecionado no modal, fecha o modal
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      
      // Recarrega a lista do servidor para garantir sincronização
      setTimeout(() => {
        fetchOrders();
      }, 500);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Erro ao excluir pedido: ${error.message}`);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pedidos</h1>
          <p className="text-muted-foreground">
            Visualize todos os pedidos recebidos
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.numero_pedido}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {order.tipo_catalogo === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}
                      </TableCell>
                      <TableCell className="font-bold text-neon-blue">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.numero_pedido}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {selectedOrder.tipo_catalogo === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Itens do Pedido</p>
                  <Badge variant="outline">
                    {selectedOrder.itens.reduce((acc: number, item: any) => acc + (Number(item.quantidade || item.quantity) || 0), 0)} itens no total
                  </Badge>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedOrder.itens.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.nome || item.product_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>SKU: {item.sku}</span>
                          <span>|</span>
                          <span>{Number(item.quantidade || item.quantity || 0)} x {formatPrice(item.preco || item.unit_price)}</span>
                        </div>
                      </div>
                      <p className="font-bold text-neon-blue">{formatPrice(item.total || item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.desconto_valor > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-green-500">
                      -{formatPrice(selectedOrder.desconto_valor)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-neon-blue">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.mensagem_whatsapp && (
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-green-500 mb-2">Mensagem enviada no WhatsApp</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {selectedOrder.mensagem_whatsapp}
                  </pre>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Pedido
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}