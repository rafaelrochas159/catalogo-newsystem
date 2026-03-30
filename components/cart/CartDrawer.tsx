"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CartItem } from './CartItem';
import { useCart } from '@/hooks/useCart';
import { formatPrice, generateProfessionalOrderMessage, getWhatsAppLink, isValidEmail, maskPhone } from '@/lib/utils';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';
import {
  ShoppingCart,
  Trash2,
  AlertTriangle,
  Check,
  MessageCircle,
  MapPin,
  ChevronLeft,
  Copy,
  QrCode,
  Loader2,
  CreditCard,
} from 'lucide-react';
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

interface CustomerData {
  nome: string;
  telefone: string;
  email: string;
  /**
   * CPF ou CNPJ do comprador. Não é obrigatório, mas ajuda no controle
   * administrativo e na emissão de notas fiscais. Deve ser informado
   * sem máscara ou com máscara (o backend removerá os caracteres não numéricos).
   */
  cpf_cnpj?: string;
}

interface ViaCepResponse {
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

interface PixPaymentData {
  numero_pedido: string;
  checkout_token: string | null;
  valor: number;
  qr_code_base64: string | null;
  pix_copia_cola: string | null;
  payment_id_gateway: string | null;
  status_pagamento: string;
}

interface PixOrderSnapshot {
  customer: CustomerData;
  items: Array<{
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  total: number;
}

function playApprovedTone() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (error) {
    console.warn('Não foi possível tocar o áudio de aprovação.', error);
  }
}

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'whatsapp' | 'pix'>('pix');
  const [address, setAddress] = useState<AddressData>({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
  });
  const [customer, setCustomer] = useState<CustomerData>({
    nome: '',
    telefone: '',
    email: '',
    cpf_cnpj: '',
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [lastFetchedCep, setLastFetchedCep] = useState('');
  const [cepError, setCepError] = useState('');
  const [pixPayment, setPixPayment] = useState<PixPaymentData | null>(null);
  const [pixOrderSnapshot, setPixOrderSnapshot] = useState<PixOrderSnapshot | null>(null);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [pixApproved, setPixApproved] = useState(false);
  // Sessão do cliente. Se null, o usuário não está autenticado. É usada
  // para impedir o checkout de usuários não logados.
  const [clientSession, setClientSession] = useState<any>(null);
  const numberInputRef = useRef<HTMLInputElement | null>(null);

  // Ao montar, se o usuário estiver logado via Supabase, busca seus dados
  // na tabela de clientes para preencher automaticamente os campos de checkout.
  useEffect(() => {
    async function loadCustomerFromSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;
        const { data: cliente, error } = await supabase
          .from('clientes')
          .select('nome, email, telefone, cpf_cnpj, endereco')
          .eq('id', userId)
          .single();
        if (error || !cliente) return;
        setCustomer((prev) => ({
          ...prev,
          nome: cliente.nome || prev.nome,
          email: cliente.email || prev.email,
          telefone: cliente.telefone || prev.telefone,
          cpf_cnpj: cliente.cpf_cnpj || prev.cpf_cnpj,
        }));
        if (cliente.endereco) {
          setAddress((prev) => ({
            ...prev,
            ...cliente.endereco,
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar dados do cliente logado', e);
      }
    }
    loadCustomerFromSession();
  }, []);

  // Observa a sessão do usuário para atualizar o estado clientSession. Isso
  // garante que o componente saiba se o cliente está logado e possa restringir
  // o checkout para usuários autenticados. Tipamos explicitamente os
  // retornos para evitar erros de compilação.
  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const { data }: any = res;
      setClientSession(data?.session ?? null);
    });
    const { data: listener }: any = supabase.auth.onAuthStateChange((_: any, session: any) => {
      setClientSession(session);
    });
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Persist customer email locally whenever a valid email is entered. This is used
  // for customer recovery (prefilling the "Meus Pedidos" page and showing
  // recommendations on the home page). Storing the email helps us link the
  // customer across sessions without breaking existing flows. Errors are
  // silently ignored to avoid impacting the checkout experience.
  useEffect(() => {
    if (customer.email && isValidEmail(customer.email)) {
      try {
        localStorage.setItem('ns_last_email', customer.email.trim().toLowerCase());
      } catch (e) {
        // ignore storage errors (e.g., private mode)
      }
    }
  }, [customer.email]);

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

  const orderItems = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.productId,
        product_name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        type: item.type,
      })),
    [items]
  );

  useEffect(() => {
    const cepNumbers = address.cep.replace(/\D/g, '');
    if (cepNumbers.length !== 8 || cepNumbers === lastFetchedCep) return;

    const fetchCep = async () => {
      setIsFetchingCep(true);
      setCepError('');
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
        const data: ViaCepResponse = await response.json();

        if (!response.ok || data.erro) {
          setCepError('CEP não encontrado. Confira o número e preencha manualmente.');
          toast.error('CEP não encontrado');
          return;
        }

        setAddress((prev) => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: prev.complemento || data.complemento || '',
        }));
        setLastFetchedCep(cepNumbers);
        toast.success('Endereço preenchido automaticamente');
        setTimeout(() => numberInputRef.current?.focus(), 60);
      } catch (error) {
        console.error(error);
        setCepError('Não foi possível consultar o CEP agora.');
        toast.error('Falha ao consultar o CEP');
      } finally {
        setIsFetchingCep(false);
      }
    };

    fetchCep();
  }, [address.cep, lastFetchedCep]);

  useEffect(() => {
    if (!pixPayment || pixApproved) return;

    const interval = window.setInterval(async () => {
      try {
        setIsPollingPayment(true);
        const reference = pixPayment.checkout_token || pixPayment.numero_pedido;
        const response = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) return;

        setPixPayment((prev) =>
          prev
            ? {
                ...prev,
                status_pagamento: data.status_pagamento || prev.status_pagamento,
                qr_code_base64: data.qr_code_base64 || prev.qr_code_base64,
                pix_copia_cola: data.pix_copia_cola || prev.pix_copia_cola,
              }
            : prev
        );

        if (data.status_pagamento === 'approved') {
          setPixApproved(true);
          setIsPollingPayment(false);
          playApprovedTone();
          clearCart();
          toast.success('Pagamento aprovado! Acesso liberado para o comprador.');
        }
      } catch (error) {
        console.error('Erro ao consultar status do Pix', error);
      } finally {
        setIsPollingPayment(false);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pixPayment, pixApproved, clearCart]);

  const resetCheckout = () => {
    setAddress({ cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', complemento: '' });
    setCustomer({ nome: '', telefone: '', email: '' });
    setLastFetchedCep('');
    setCepError('');
    setPixPayment(null);
    setPixOrderSnapshot(null);
    setPixApproved(false);
    setPaymentMethod('pix');
    setShowCheckoutForm(false);
  };

  const validateCheckoutData = () => {
    if (!customer.nome || !customer.telefone || !customer.email) {
      toast.error('Preencha nome, telefone e e-mail.');
      return false;
    }
    if (!isValidEmail(customer.email)) {
      toast.error('Digite um e-mail válido.');
      return false;
    }
    if (!address.cep || !address.rua || !address.numero || !address.bairro || !address.cidade || !address.estado) {
      toast.error('Preencha todos os campos obrigatórios do endereço.');
      return false;
    }
    return true;
  };

  const openWhatsApp = (whatsappLink: string) => {
    window.location.href = whatsappLink;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.assign(whatsappLink);
      }
    }, 800);
  };

  const handleWhatsAppCheckout = async () => {
    // Impede checkout via WhatsApp se não houver sessão do cliente
    if (!clientSession) {
      toast.error('Você precisa estar logado para finalizar o pedido.');
      return;
    }
    if (!canCheckout || !validateCheckoutData()) return;

    setIsCheckingOut(true);
    try {
      const orderNumber = `NS${Date.now()}`;
      const message = generateProfessionalOrderMessage({
        orderNumber,
        catalogType: catalogType!,
        items: orderItems.map((item) => ({
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
        customer,
        paymentMethod: 'WhatsApp',
      });

      const { data: order, error } = await supabase
        .from('pedidos')
        .insert({
          numero_pedido: orderNumber,
          cliente_nome: customer.nome,
          cliente_telefone: customer.telefone,
          cliente_email: customer.email,
          cliente_cpf_cnpj: customer.cpf_cnpj || null,
          tipo_catalogo: catalogType,
          subtotal,
          desconto_valor: discount,
          desconto_percentual: discount > 0 ? BUSINESS_RULES.discountPercentage : 0,
          total,
          itens: orderItems,
          endereco: address,
          status: 'pending',
          status_pedido: 'aguardando_contato',
          status_pagamento: 'not_applicable',
          forma_pagamento: 'whatsapp',
          whatsapp_enviado: true,
          mensagem_whatsapp: message,
        } as any)
        .select('*')
        .single();

      if (error) throw new Error(error.message);

      const whatsappLink = getWhatsAppLink(COMPANY_INFO.whatsapp, message);
      clearCart();
      resetCheckout();
      setIsOpen(false);
      toast.success(`Pedido ${order?.numero_pedido || orderNumber} enviado com sucesso!`);
      openWhatsApp(whatsappLink);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao finalizar pedido via WhatsApp.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePixCheckout = async () => {
    // Impede checkout se o usuário não estiver autenticado. Esse check
    // complementa a validação feita ao abrir o formulário, garantindo que
    // requisições programáticas também sejam bloqueadas.
    if (!clientSession) {
      toast.error('Você precisa estar logado para finalizar o pedido.');
      return;
    }
    if (!canCheckout || !validateCheckoutData()) return;

    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: customer,
          endereco: address,
          itens: orderItems,
          subtotal,
          desconto_valor: discount,
          desconto_percentual: discount > 0 ? BUSINESS_RULES.discountPercentage : 0,
          total,
          tipo_catalogo: catalogType,
          cpf_cnpj: customer.cpf_cnpj || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao gerar o Pix.');

      setPixOrderSnapshot({
        customer: { ...customer },
        items: orderItems.map((item) => ({
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        total,
      });

      setPixPayment({
        numero_pedido: data.numero_pedido,
        checkout_token: data.checkout_token || null,
        valor: data.valor,
        qr_code_base64: data.qr_code_base64,
        pix_copia_cola: data.pix_copia_cola,
        payment_id_gateway: data.payment_id_gateway,
        status_pagamento: data.status_pagamento,
      });

      toast.success('Pix gerado com sucesso. Pague e aguarde a confirmação automática.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o Pix.');
    } finally {
      setIsCheckingOut(false);
    }
  };


  const buildApprovedWhatsAppLink = () => {
    // Somente gera link se houver pagamento confirmado e snapshot do pedido
    if (!pixPayment || !pixOrderSnapshot) return null;

    // Converte os itens do snapshot para o formato esperado por generateOrderMessage
    const orderItemsForMessage = pixOrderSnapshot.items.map((item) => ({
      name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
    }));

    // Calcula subtotal e desconto com base nos itens do snapshot
    const subtotalValue = orderItemsForMessage.reduce((acc, item) => acc + item.totalPrice, 0);
    const totalValue = pixOrderSnapshot.total;
    const discountValue = subtotalValue - totalValue;

    // Gera mensagem estruturada utilizando utilidade padrão do projeto
    const message = generateProfessionalOrderMessage({
      orderNumber: pixPayment.numero_pedido,
      catalogType: catalogType!,
      items: orderItemsForMessage,
      subtotal: subtotalValue,
      discount: discountValue,
      total: totalValue,
      address,
      customer,
      paymentMethod: 'Pix aprovado',
    });

    // Usa o número de WhatsApp da empresa definido em constants para enviar a mensagem
    return getWhatsAppLink(COMPANY_INFO.whatsapp, message);
  };

  const handleCopyPix = async () => {
    if (!pixPayment?.pix_copia_cola) return;
    try {
      await navigator.clipboard.writeText(pixPayment.pix_copia_cola);
      toast.success('Código Pix copiado.');
    } catch {
      toast.error('Não foi possível copiar o código Pix.');
    }
  };

  if (!isMounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <ShoppingCart className="h-5 w-5" />
      </Button>
    );
  }

  if (itemCount === 0 && !pixPayment) {
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
            <p className="text-muted-foreground mb-6">Adicione produtos ao seu carrinho para continuar.</p>
            <Button onClick={() => setIsOpen(false)} className="bg-neon-blue text-black hover:bg-neon-blue/90">
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
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-neon-blue text-xs font-bold flex items-center justify-center text-black">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md flex flex-col h-[100dvh] p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {pixPayment ? 'Pagamento Pix' : `Carrinho (${itemCount})`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="px-6 py-4 space-y-4">
              {pixPayment ? (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Pedido</p>
                        <p className="font-semibold">{pixPayment.numero_pedido}</p>
                      </div>
                      <Badge variant={pixApproved ? 'default' : 'secondary'}>
                        {pixApproved ? 'Pago' : isPollingPayment ? 'Consultando...' : 'Aguardando pagamento'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-neon-blue">{formatPrice(pixPayment.valor)}</span>
                    </div>
                  </div>

                  {pixPayment.qr_code_base64 && (
                    <div className="rounded-xl border p-4 space-y-3">
                      <p className="font-medium flex items-center gap-2"><QrCode className="h-4 w-4" /> QR Code Pix</p>
                      <div className="bg-white rounded-xl p-4 max-w-xs mx-auto">
                        <img src={`data:image/png;base64,${pixPayment.qr_code_base64}`} alt="QR Code Pix" className="w-full" />
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border p-4 space-y-3">
                    <p className="font-medium">Pix copia e cola</p>
                    <div className="rounded-lg border p-3 text-xs break-all">{pixPayment.pix_copia_cola || 'Código indisponível.'}</div>
                    <Button variant="outline" className="w-full" onClick={handleCopyPix} disabled={!pixPayment.pix_copia_cola}>
                      <Copy className="h-4 w-4 mr-2" /> Copiar código Pix
                    </Button>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3 text-sm">
                    <p className="font-medium">Status automático</p>
                    <p className="text-muted-foreground">Após o pagamento, o Mercado Pago envia o webhook e o pedido é liberado automaticamente.</p>
                    <Button variant="outline" className="w-full" onClick={async () => {
                      if (!pixPayment) return;
                      const reference = pixPayment.checkout_token || pixPayment.numero_pedido;
                      const response = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, { cache: 'no-store' });
                      const data = await response.json();
                      if (!response.ok) {
                        toast.error(data.error || 'Erro ao consultar status do pagamento.');
                        return;
                      }
                      setPixPayment((prev) => prev ? { ...prev, status_pagamento: data.status_pagamento, qr_code_base64: data.qr_code_base64 || prev.qr_code_base64, pix_copia_cola: data.pix_copia_cola || prev.pix_copia_cola } : prev);
                      if (data.status_pagamento === 'approved') {
                        setPixApproved(true);
                        clearCart();
                        toast.success('Pagamento já aprovado.');
                      } else {
                        toast('Pagamento ainda não aprovado.');
                      }
                    }}>
                      {isPollingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Atualizar status agora
                    </Button>

                    {pixApproved && (
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-green-500 text-black hover:bg-green-500/90"
                          onClick={() => {
                            const whatsappLink = buildApprovedWhatsAppLink();
                            if (!whatsappLink) {
                              toast.error('Telefone do cliente não encontrado para abrir o WhatsApp.');
                              return;
                            }
                            openWhatsApp(whatsappLink);
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Enviar pedido aprovado para WhatsApp
                        </Button>
                        <Button className="w-full bg-neon-blue text-black hover:bg-neon-blue/90" onClick={() => {
                          resetCheckout();
                          setIsOpen(false);
                        }}>
                          Pedido pago. Fechar checkout
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : !showCheckoutForm ? (
                <>
                  <div>
                    <Badge variant={catalogType === 'UNITARIO' ? 'default' : 'secondary'}>
                      {catalogType === 'UNITARIO' ? 'Catálogo Unitário' : 'Caixa Fechada'}
                    </Badge>
                  </div>

                  {catalogType === 'UNITARIO' && !canCheckout && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-500">Pedido mínimo não atingido</p>
                        <p className="text-muted-foreground">Faltam {formatPrice(remainingForMinOrder)} para atingir o pedido mínimo de {formatPrice(BUSINESS_RULES.minOrderValue)}.</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <CartItem item={item} catalogType={catalogType!} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="text-green-500">-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-neon-blue">{formatPrice(total)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Button variant="ghost" size="sm" onClick={() => setShowCheckoutForm(false)} className="px-0 hover:bg-transparent">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                    </Button>
                    <MapPin className="h-4 w-4" /> Checkout
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Nome *</Label>
                      <Input value={customer.nome} onChange={(e) => setCustomer((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Seu nome" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Telefone *</Label>
                      <Input value={customer.telefone} onChange={(e) => setCustomer((prev) => ({ ...prev, telefone: maskPhone(e.target.value) }))} placeholder="(11) 99999-9999" inputMode="tel" />
                    </div>
                    <div className="grid gap-2">
                      <Label>CPF/CNPJ</Label>
                      <Input
                        value={customer.cpf_cnpj || ''}
                        onChange={(e) => setCustomer((prev) => ({ ...prev, cpf_cnpj: e.target.value }))}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>E-mail *</Label>
                      <Input type="email" value={customer.email} onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))} placeholder="voce@empresa.com" />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold">Endereço de entrega</h4>
                    <div className="grid gap-2">
                      <Label>CEP *</Label>
                      <Input
                        value={address.cep}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5, 8)}`;
                          setAddress((prev) => ({ ...prev, cep: value }));
                          if (value.replace(/\D/g, '').length < 8) setLastFetchedCep('');
                        }}
                        placeholder="00000-000"
                        inputMode="numeric"
                      />
                      {isFetchingCep && <p className="text-xs text-muted-foreground">Buscando endereço pelo CEP...</p>}
                      {cepError && <p className="text-xs text-red-500">{cepError}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 grid gap-2">
                        <Label>Rua *</Label>
                        <Input value={address.rua} onChange={(e) => setAddress((prev) => ({ ...prev, rua: e.target.value }))} placeholder="Nome da rua" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Número *</Label>
                        <Input ref={numberInputRef} value={address.numero} onChange={(e) => setAddress((prev) => ({ ...prev, numero: e.target.value }))} placeholder="123" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Bairro *</Label>
                      <Input value={address.bairro} onChange={(e) => setAddress((prev) => ({ ...prev, bairro: e.target.value }))} placeholder="Nome do bairro" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 grid gap-2">
                        <Label>Cidade *</Label>
                        <Input value={address.cidade} onChange={(e) => setAddress((prev) => ({ ...prev, cidade: e.target.value }))} placeholder="São Paulo" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Estado *</Label>
                        <Input value={address.estado} onChange={(e) => setAddress((prev) => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Complemento</Label>
                      <Input value={address.complemento} onChange={(e) => setAddress((prev) => ({ ...prev, complemento: e.target.value }))} placeholder="Apto, bloco, referência..." />
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-semibold">Forma de pagamento</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPaymentMethod('pix')} className={`rounded-xl border p-4 text-left transition ${paymentMethod === 'pix' ? 'border-neon-blue bg-neon-blue/10' : 'border-border'}`}>
                        <div className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4" /> Pix Mercado Pago</div>
                        <p className="text-xs text-muted-foreground mt-1">Gera QR Code e confirma automaticamente.</p>
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('whatsapp')} className={`rounded-xl border p-4 text-left transition ${paymentMethod === 'whatsapp' ? 'border-neon-blue bg-neon-blue/10' : 'border-border'}`}>
                        <div className="flex items-center gap-2 font-medium"><MessageCircle className="h-4 w-4" /> WhatsApp</div>
                        <p className="text-xs text-muted-foreground mt-1">Mantém o fluxo atual de pedido pelo WhatsApp.</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {!pixPayment && (
          <SheetFooter className="px-6 py-4 border-t shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {!showCheckoutForm ? (
              <div className="w-full flex gap-2">
                <Button variant="outline" onClick={clearCart} className="flex-1"><Trash2 className="h-4 w-4 mr-2" />Limpar</Button>
                <Button
                  onClick={() => {
                    // Requer autenticação para prosseguir com o checkout. Se o
                    // usuário não estiver logado, redireciona para a página de login
                    // e mostra um aviso. Caso contrário, exibe o formulário de
                    // checkout.
                    if (!clientSession) {
                      toast.error('Para finalizar o pedido, faça login ou cadastro.');
                      if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                      }
                      return;
                    }
                    setShowCheckoutForm(true);
                  }}
                  disabled={!canCheckout}
                  className="flex-1 bg-neon-blue text-black hover:bg-neon-blue/90"
                >
                  <Check className="h-4 w-4 mr-2" /> Continuar checkout
                </Button>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                {paymentMethod === 'pix' ? (
                  <Button onClick={handlePixCheckout} disabled={isCheckingOut} className="w-full bg-neon-blue text-black hover:bg-neon-blue/90">
                    {isCheckingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                    Gerar Pix com Mercado Pago
                  </Button>
                ) : (
                  <Button onClick={handleWhatsAppCheckout} disabled={isCheckingOut} className="w-full bg-neon-blue text-black hover:bg-neon-blue/90">
                    {isCheckingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                    Enviar pedido pelo WhatsApp
                  </Button>
                )}
                {paymentMethod === 'pix' && (
                  <p className="text-xs text-muted-foreground text-center">
                    O pagamento fica vinculado por <code>external_reference = numero_pedido</code> e confirmado só pelo webhook.
                  </p>
                )}
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
