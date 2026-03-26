"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter,
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CartItem } from './CartItem';
import { useCart } from '@/hooks/useCart';
import { formatPrice, generateOrderMessage, getWhatsAppLink } from '@/lib/utils';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';
import { ShoppingCart, Trash2, AlertTriangle, Check, MessageCircle, MapPin, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface AddressData {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState<AddressData>({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const items = useCart((state) => state.items);
  const catalogType = useCart((state) => state.catalogType);
  const clearCart = useCart((state) => state.clearCart);
  const getSubtotal = useCart((state) => state.getSubtotal);
  const getDiscount = useCart((state) => state.getDiscount);
  const getTotal = useCart((state) => state.getTotal);
  const getItemCount = useCart((state) => state.getItemCount);
  const hasMinOrder = useCart((state) => state.hasMinOrder);
  const getRemainingForMinOrder = useCart((state) => state.getRemainingForMinOrder);

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();
  const itemCount = getItemCount();
  const canCheckout = hasMinOrder();
  const remainingForMinOrder = getRemainingForMinOrder();

  const handleCheckout = async () => {
    if (!canCheckout) return;

    if (!address.cep || !address.rua || !address.numero || !address.bairro || !address.cidade || !address.estado) {
      toast.error('Preencha todos os campos obrigatórios do endereço');
      return;
    }

    setIsCheckingOut(true);

    try {
      const orderItems = items.map(item => ({
        product_id: item.productId,
        product_name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        type: item.type,
      }));

      const orderData = {
        numero_pedido: `NS${Date.now()}`,
        tipo_catalogo: catalogType,
        subtotal,
        desconto_valor: discount,
        desconto_percentual: discount > 0 ? BUSINESS_RULES.discountPercentage : 0,
        total,
        itens: orderItems,
        endereco: address,
        status: 'pending',
        whatsapp_enviado: false,
      };

      const { data: order, error } = await supabase
        .from('pedidos')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao salvar pedido: ${error.message}`);
      }

      const message = generateOrderMessage({
        orderNumber: order.numero_pedido || orderData.numero_pedido,
        catalogType: catalogType!,
        items: orderItems.map(item => ({
          name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        })),
        subtotal,
        discount,
        total,
        address,
      });

      await supabase
        .from('pedidos')
        .update({ 
          mensagem_whatsapp: message,
          whatsapp_enviado: true 
        })
        .eq('id', order.id);

      const whatsappLink = getWhatsAppLink(COMPANY_INFO.whatsapp, message);
      window.open(whatsappLink, '_blank');

      clearCart();
      setAddress({
        cep: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento: '',
      });
      setShowAddressForm(false);
      setIsOpen(false);
      
      toast.success('Pedido enviado com sucesso!');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(`Erro ao finalizar pedido: ${error.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!isMounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <ShoppingCart className="h-5 w-5" />
      </Button>
    );
  }

  if (itemCount === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Carrinho vazio</h3>
            <p className="text-muted-foreground mb-6">
              Adicione produtos ao seu carrinho para continuar.
            </p>
            <Button 
              onClick={() => setIsOpen(false)}
              className="bg-neon-blue text-black hover:bg-neon-blue/90"
            >
              Continuar Comprando
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-neon-blue text-xs font-bold flex items-center justify-center text-black">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        </Button>
      </SheetTrigger>
      
      {/* Estrutura: Header Fixo + Conteúdo Scrollable + Footer Fixo */}
      <SheetContent className="w-full sm:max-w-md flex flex-col h-[100dvh] p-0 overflow-hidden">
        
        {/* HEADER FIXO */}
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {/* CONTEÚDO SCROLLABLE (flex-1 ocupa espaço restante) */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="px-6 py-4 space-y-4">
              
              {/* Badge do tipo */}
              <div>
                <Badge variant={catalogType === 'UNITARIO' ? 'default' : 'secondary'}>
                  {catalogType === 'UNITARIO' ? 'Catálogo Unitário' : 'Caixa Fechada'}
                </Badge>
              </div>

              {/* Alerta de pedido mínimo */}
              {catalogType === 'UNITARIO' && !canCheckout && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2"
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Pedido mínimo não atingido</p>
                    <p className="text-muted-foreground">
                      Faltam {formatPrice(remainingForMinOrder)} para atingir o pedido mínimo de {formatPrice(BUSINESS_RULES.minOrderValue)}.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ETAPA 1: Itens do Carrinho (quando NÃO mostra formulário) */}
              {!showAddressForm && (
                <>
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div
                          key={`${item.productId}-${item.type}`}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                        >
                          <CartItem item={item} catalogType={catalogType || 'UNITARIO'} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <Separator />

                  {/* Resumo */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Desconto ({BUSINESS_RULES.discountPercentage}%)
                        </span>
                        <span className="text-green-500">-{formatPrice(discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-neon-blue">{formatPrice(total)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* ETAPA 2: Formulário de Endereço (quando mostra formulário) */}
              {showAddressForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAddressForm(false)}
                      className="p-0 h-auto"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar
                    </Button>
                    <h4 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço de Entrega
                    </h4>
                  </div>

                  <div>
                    <Label className="text-xs">CEP *</Label>
                    <Input
                      placeholder="00000-000"
                      maxLength={9}
                      value={address.cep}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 5) {
                          value = value.slice(0, 5) + '-' + value.slice(5, 8);
                        }
                        setAddress({ ...address, cep: value });
                      }}
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Rua *</Label>
                      <Input
                        placeholder="Nome da rua"
                        value={address.rua}
                        onChange={(e) => setAddress({ ...address, rua: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Número *</Label>
                      <Input
                        placeholder="123"
                        value={address.numero}
                        onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Bairro *</Label>
                    <Input
                      placeholder="Nome do bairro"
                      value={address.bairro}
                      onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Cidade *</Label>
                      <Input
                        placeholder="São Paulo"
                        value={address.cidade}
                        onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Estado *</Label>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        value={address.estado}
                        onChange={(e) => setAddress({ ...address, estado: e.target.value.toUpperCase() })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Complemento (opcional)</Label>
                    <Input
                      placeholder="Apto, bloco, referência..."
                      value={address.complemento}
                      onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  
                  {/* Espaço extra no final para não cortar conteúdo */}
                  <div className="h-4" />
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* FOOTER FIXO (sempre visível no rodapé) */}
        <SheetFooter className="flex-col gap-2 px-6 py-4 border-t shrink-0 bg-background mt-auto z-10">
          {!showAddressForm ? (
            <>
              <Button
                className="w-full bg-neon-blue hover:bg-neon-blue/90 text-black font-semibold h-11"
                onClick={() => setShowAddressForm(true)}
                disabled={!canCheckout}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Finalizar pelo WhatsApp
              </Button>

              <Button
                variant="outline"
                className="w-full h-10"
                onClick={clearCart}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Carrinho
              </Button>
            </>
          ) : (
            <Button
              className="w-full bg-neon-blue hover:bg-neon-blue/90 text-black font-semibold h-11"
              onClick={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <>
                  <Check className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar Pedido pelo WhatsApp
                </>
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
