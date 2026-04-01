"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { CartItem } from './CartItem';
import { useCart } from '@/hooks/useCart';
import { formatPrice, isValidEmail, maskPhone } from '@/lib/utils';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';
import { authorizedFetch, getAnonymousVisitorId, trackClientEvent } from '@/lib/client-auth';
import { CART_DRAWER_OPEN_EVENT } from '@/lib/cart-ui';
import {
  buildCheckoutPrefill,
  mergeCheckoutAddressForm,
  mergeCheckoutCustomerForm,
} from '@/lib/checkout';
import { readJsonSafely } from '@/lib/http';
import {
  buildOrderWhatsAppMessage,
  getOrderWhatsAppActionLabel,
  getOrderWhatsAppLink,
  getOrderWhatsAppStatusText,
} from '@/lib/order-whatsapp';
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
  TicketPercent,
  Sparkles,
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
   * CPF ou CNPJ do comprador. NÃ£o Ã© obrigatÃ³rio, mas ajuda no controle
   * administrativo e na emissÃ£o de notas fiscais. Deve ser informado
   * sem mÃ¡scara ou com mÃ¡scara (o backend removerÃ¡ os caracteres nÃ£o numÃ©ricos).
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
  address: AddressData;
  items: Array<{
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA';
  subtotal: number;
  discount: number;
  total: number;
}

interface AppliedCouponState {
  code: string;
  discountValue: number;
  discountType: string;
  label: string;
}

interface CartOpenEventDetail {
  productName?: string | null;
  source?: 'product-card' | 'product-page' | 'quick-view' | 'unknown';
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
    console.warn('NÃ£o foi possÃ­vel tocar o Ã¡udio de aprovaÃ§Ã£o.', error);
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
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponState | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [abandonedCartId, setAbandonedCartId] = useState<string | null>(null);
  const [cartSuggestions, setCartSuggestions] = useState<any[]>([]);
  const [postPurchaseSuggestions, setPostPurchaseSuggestions] = useState<any[]>([]);
  const [checkoutAccountData, setCheckoutAccountData] = useState<Record<string, unknown> | null>(null);
  const [isHydratingCheckout, setIsHydratingCheckout] = useState(false);
  const [recentlyAddedProductName, setRecentlyAddedProductName] = useState<string | null>(null);
  // SessÃ£o do cliente. Se null, o usuÃ¡rio nÃ£o estÃ¡ autenticado. Ã‰ usada
  // para impedir o checkout de usuÃ¡rios nÃ£o logados.
  const [clientSession, setClientSession] = useState<any>(null);
  const numberInputRef = useRef<HTMLInputElement | null>(null);
  const lastHydratedUserIdRef = useRef<string | null>(null);
  const lastLoadedAccountUserIdRef = useRef<string | null>(null);
  const checkoutHydrationPromiseRef = useRef<Promise<boolean> | null>(null);
  const hasUserEditedAddressRef = useRef(false);

  const markAddressAsEdited = () => {
    hasUserEditedAddressRef.current = true;
  };

  const applyCheckoutPrefillState = useCallback((args: {
    accountData?: Record<string, unknown> | null;
    sessionUser?: any;
    forcePrefill?: boolean;
  }) => {
    const sessionUserId = args.sessionUser?.id || null;
    if (!sessionUserId || !args.accountData) {
      return;
    }

    if (
      lastLoadedAccountUserIdRef.current &&
      lastLoadedAccountUserIdRef.current !== sessionUserId
    ) {
      return;
    }

    const prefill = buildCheckoutPrefill({
      account: args.accountData as any,
      sessionUser: args.sessionUser || null,
    });
    const shouldForce = args.forcePrefill || lastHydratedUserIdRef.current !== sessionUserId;
    const allowAddressPrefill =
      args.forcePrefill || shouldForce || !hasUserEditedAddressRef.current;
    const cepDigits = prefill.address.cep.replace(/\D/g, '');

    if (allowAddressPrefill && cepDigits.length === 8) {
      setCepError('');
      setLastFetchedCep('');
    }

    setCustomer((prev) => mergeCheckoutCustomerForm(prev, prefill.customer, shouldForce));
    setAddress((prev) => mergeCheckoutAddressForm(prev, prefill.address, allowAddressPrefill));
    lastHydratedUserIdRef.current = sessionUserId;
  }, []);

  const loadCheckoutAccountData = async ({
    showLoading = false,
    forcePrefill = false,
  }: {
    showLoading?: boolean;
    forcePrefill?: boolean;
  } = {}) => {
    if (checkoutHydrationPromiseRef.current) {
      return checkoutHydrationPromiseRef.current;
    }

    const accountPromise = (async () => {
      try {
        if (showLoading) {
          setIsHydratingCheckout(true);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setClientSession(session ?? null);

        if (!session?.access_token || !session.user) {
          setCheckoutAccountData(null);
          return false;
        }

        const accountResponse = await authorizedFetch('/api/account', {
          cache: 'no-store',
        });
        const accountJson = await readJsonSafely<{ data?: Record<string, unknown> }>(accountResponse);
        const nextAccountData = accountResponse.ok ? (accountJson?.data as any) : null;

        lastLoadedAccountUserIdRef.current = session.user.id;
        setCheckoutAccountData(nextAccountData);

        if (nextAccountData) {
          applyCheckoutPrefillState({
            accountData: nextAccountData,
            sessionUser: session.user,
            forcePrefill,
          });
        }

        return true;
      } catch (error) {
        console.error('Erro ao hidratar checkout com a conta autenticada', error);
        return false;
      } finally {
        checkoutHydrationPromiseRef.current = null;
        if (showLoading) {
          setIsHydratingCheckout(false);
        }
      }
    })();

    checkoutHydrationPromiseRef.current = accountPromise;
    return accountPromise;
  };

  useEffect(() => {
    const handleCartOpen = (event: Event) => {
      const detail = (event as CustomEvent<CartOpenEventDetail>).detail;
      setIsOpen(true);
      setPixPayment(null);
      setPixApproved(false);
      setShowCheckoutForm(false);
      setRecentlyAddedProductName(detail?.productName?.trim() || 'Produto');
    };

    window.addEventListener(CART_DRAWER_OPEN_EVENT, handleCartOpen as EventListener);

    return () => {
      window.removeEventListener(CART_DRAWER_OPEN_EVENT, handleCartOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const { data }: any = res;
      setClientSession(data?.session ?? null);

      if (data?.session?.user?.id) {
        void loadCheckoutAccountData();
      }
    });

    const { data: listener }: any = supabase.auth.onAuthStateChange((_: any, session: any) => {
      setClientSession(session ?? null);

      if (session?.user?.id) {
        if (lastHydratedUserIdRef.current !== session.user.id) {
          hasUserEditedAddressRef.current = false;
        }
        void loadCheckoutAccountData();
      } else {
        lastHydratedUserIdRef.current = null;
        lastLoadedAccountUserIdRef.current = null;
        hasUserEditedAddressRef.current = false;
        setCheckoutAccountData(null);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCheckoutPrefillState]);

  useEffect(() => {
    applyCheckoutPrefillState({
      accountData: checkoutAccountData,
      sessionUser: clientSession?.user || null,
      forcePrefill: false,
    });
  }, [applyCheckoutPrefillState, checkoutAccountData, clientSession]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!recentlyAddedProductName || !isOpen || showCheckoutForm || pixPayment) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRecentlyAddedProductName(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [isOpen, pixPayment, recentlyAddedProductName, showCheckoutForm]);

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
  const couponDiscount = appliedCoupon?.discountValue || 0;
  const finalTotal = Math.max(total - couponDiscount, 0);
  const checkoutProgress = pixApproved ? 100 : pixPayment ? 80 : showCheckoutForm ? 45 : itemCount > 0 ? 20 : 0;

  const openCheckoutStep = useCallback(async () => {
    if (!clientSession) {
      toast.error('Para finalizar o pedido, faca login ou cadastro.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return;
    }

    hasUserEditedAddressRef.current = false;
    await loadCheckoutAccountData({ showLoading: true, forcePrefill: true });
    await trackClientEvent({
      eventName: 'initiate_checkout',
      page: '/checkout',
      metadata: {
        phase: 'form_opened',
        total: finalTotal,
        itemCount,
      },
      email: customer.email || clientSession.user?.email || null,
    });
    setShowCheckoutForm(true);
  }, [clientSession, customer.email, finalTotal, itemCount]);

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
    if (!clientSession?.access_token) return;

    const loadAbandonedCart = async () => {
      try {
        const response = await authorizedFetch('/api/cart/abandoned', { cache: 'no-store' });
        if (!response.ok) return;
        const json = await response.json();
        if (json.data?.id) {
          setAbandonedCartId(json.data.id);
        }
      } catch {
        // nÃ£o bloquear o carrinho por causa disso
      }
    };

    loadAbandonedCart();
  }, [clientSession?.access_token]);

  useEffect(() => {
    const loadCartSuggestions = async () => {
      if (!items.length) {
        setCartSuggestions([]);
        return;
      }

      try {
        const productIds = items.map((item) => item.productId).join(',');
        const searchParams = new URLSearchParams({
          context: 'cart',
          productIds,
          catalogType: catalogType || 'UNITARIO',
          anonymousId: getAnonymousVisitorId(),
          limit: '6',
        });
        const response = await authorizedFetch(`/api/recommendations/ai?${searchParams.toString()}`, {
          cache: 'no-store',
        });

        if (!response.ok) return;
        const json = await response.json();
        setCartSuggestions(Array.isArray(json.data) ? json.data : []);
      } catch {
        setCartSuggestions([]);
      }
    };

    loadCartSuggestions();
  }, [items, catalogType]);

  useEffect(() => {
    if (!clientSession?.access_token || !items.length || pixPayment) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await authorizedFetch('/api/cart/abandoned', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: abandonedCartId,
            email: customer.email || clientSession?.user?.email || null,
            customerName: customer.nome || null,
            customerPhone: customer.telefone || null,
            items: orderItems,
            cartType: catalogType,
            itemCount,
            subtotal,
            total: finalTotal,
            status: 'abandoned',
          }),
        });

        if (!response.ok) return;
        const json = await response.json();
        if (json.data?.id) {
          setAbandonedCartId(json.data.id);
        }

        await trackClientEvent({
          eventName: 'cart_abandoned',
          page: '/checkout',
          metadata: {
            itemCount,
            total: finalTotal,
            cartType: catalogType,
          },
          email: customer.email || clientSession?.user?.email || null,
        });
      } catch {
        // abandono nÃ£o deve travar checkout
      }
    }, 1000 * 60 * 4);

    return () => window.clearTimeout(timer);
  }, [clientSession?.access_token, items, orderItems, customer.email, customer.nome, customer.telefone, catalogType, itemCount, subtotal, finalTotal, pixPayment, abandonedCartId]);

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
          setCepError('CEP nÃ£o encontrado. Confira o nÃºmero e preencha manualmente.');
          toast.error('CEP nÃ£o encontrado');
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
        toast.success('EndereÃ§o preenchido automaticamente');
        setTimeout(() => numberInputRef.current?.focus(), 60);
      } catch (error) {
        console.error(error);
        setCepError('NÃ£o foi possÃ­vel consultar o CEP agora.');
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
          setPostPurchaseSuggestions(cartSuggestions.slice(0, 3));
          clearCart();
          clearAbandonedCart('converted');
          trackClientEvent({
            eventName: 'order_completed',
            page: '/checkout',
            metadata: {
              numeroPedido: pixPayment.numero_pedido,
              paymentMethod: 'pix',
              total: pixPayment.valor,
            },
            email: customer.email || clientSession?.user?.email || null,
          });
          toast.success('Pagamento aprovado! Acesso liberado para o comprador.');
        }
      } catch (error) {
        console.error('Erro ao consultar status do Pix', error);
      } finally {
        setIsPollingPayment(false);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pixPayment, pixApproved, clearCart, cartSuggestions]);

  const resetCheckout = () => {
    setAddress({ cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', complemento: '' });
    setCustomer({ nome: '', telefone: '', email: '', cpf_cnpj: '' });
    setLastFetchedCep('');
    setCepError('');
    setPixPayment(null);
    setPixOrderSnapshot(null);
    setPixApproved(false);
    setPaymentMethod('pix');
    setShowCheckoutForm(false);
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponFeedback(null);
    setPostPurchaseSuggestions([]);
    hasUserEditedAddressRef.current = false;
  };

  const clearAbandonedCart = async (status: 'recovered' | 'converted') => {
    if (!clientSession?.access_token || !abandonedCartId) return;

    try {
      await authorizedFetch('/api/cart/abandoned', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartId: abandonedCartId,
          status,
          customerName: customer.nome || null,
          customerPhone: customer.telefone || null,
        }),
      });
    } catch {
      // melhor esforÃ§o
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponFeedback('Digite um cupom para aplicar.');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponFeedback(null);

    try {
      const response = await authorizedFetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          items: orderItems,
          subtotal,
          total,
          abandonedCartId,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setAppliedCoupon(null);
        setCouponFeedback(json.error || 'Nao foi possivel aplicar o cupom.');
        return;
      }

      setAppliedCoupon({
        code: json.data.coupon.code,
        discountValue: Number(json.data.discountValue || 0),
        discountType: json.data.coupon.discount_type,
        label: json.data.coupon.name,
      });
      setCouponCode(json.data.coupon.code);
      setCouponFeedback(json.data.message || 'Cupom aplicado.');

      await trackClientEvent({
        eventName: 'coupon_applied',
        page: '/checkout',
        metadata: {
          code: json.data.coupon.code,
          discountValue: Number(json.data.discountValue || 0),
        },
        email: customer.email || clientSession?.user?.email || null,
      });
    } catch {
      setAppliedCoupon(null);
      setCouponFeedback('Nao foi possivel aplicar o cupom agora.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    const removedCode = appliedCoupon?.code || couponCode;
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponFeedback('Cupom removido do pedido.');

    await trackClientEvent({
      eventName: 'coupon_removed',
      page: '/checkout',
      metadata: {
        code: removedCode || null,
      },
      email: customer.email || clientSession?.user?.email || null,
    });
  };

  useEffect(() => {
    if (!appliedCoupon || !items.length) return;
    if (couponCode.trim().toUpperCase() !== appliedCoupon.code) return;

    applyCoupon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, subtotal, total]);

  const validateCheckoutData = () => {
    if (!customer.nome || !customer.telefone || !customer.email) {
      toast.error('Preencha nome, telefone e e-mail.');
      return false;
    }
    if (!isValidEmail(customer.email)) {
      toast.error('Digite um e-mail vÃ¡lido.');
      return false;
    }
    if (!address.cep || !address.rua || !address.numero || !address.bairro || !address.cidade || !address.estado) {
      toast.error('Preencha todos os campos obrigatÃ³rios do endereÃ§o.');
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
    // Impede checkout via WhatsApp se nÃ£o houver sessÃ£o do cliente
    if (!clientSession) {
      toast.error('VocÃª precisa estar logado para finalizar o pedido.');
      return;
    }
    if (!canCheckout || !validateCheckoutData()) return;

    setIsCheckingOut(true);
    try {
      const orderNumber = `NS${Date.now()}`;
      const message = buildOrderWhatsAppMessage({
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
        discount: discount + couponDiscount,
        total: finalTotal,
        address,
        customer,
        paymentMethod: 'whatsapp',
        status_pagamento: 'not_applicable',
        status_pedido: 'aguardando_contato',
      });

      const { data: order, error } = await supabase
        .from('pedidos')
        .insert({
          numero_pedido: orderNumber,
          user_id: clientSession.user.id,
          cliente_nome: customer.nome,
          cliente_telefone: customer.telefone,
          cliente_email: customer.email,
          cliente_cpf_cnpj: customer.cpf_cnpj || null,
          tipo_catalogo: catalogType,
          subtotal,
          desconto_valor: discount + couponDiscount,
          desconto_percentual: discount > 0 ? BUSINESS_RULES.discountPercentage : 0,
          total: finalTotal,
          original_total: total,
          coupon_code: appliedCoupon?.code || null,
          coupon_discount_type: appliedCoupon?.discountType || null,
          coupon_discount_value: couponDiscount,
          abandoned_cart_id: abandonedCartId,
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

      const whatsappLink = getOrderWhatsAppLink({
        orderNumber: order?.numero_pedido || orderNumber,
        catalogType: catalogType!,
        items: orderItems.map((item) => ({
          name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        })),
        subtotal,
        discount: discount + couponDiscount,
        total: finalTotal,
        address,
        customer,
        paymentMethod: 'whatsapp',
        status_pagamento: 'not_applicable',
        status_pedido: 'aguardando_contato',
      }, COMPANY_INFO.whatsapp);
      clearCart();
      await clearAbandonedCart('converted');
      resetCheckout();
      setIsOpen(false);
      toast.success(`Pedido ${order?.numero_pedido || orderNumber} enviado com sucesso!`);
      await trackClientEvent({
        eventName: 'order_completed',
        page: '/checkout',
        orderId: order?.id || null,
        metadata: {
          numeroPedido: order?.numero_pedido || orderNumber,
          paymentMethod: 'whatsapp',
          total: finalTotal,
          couponCode: appliedCoupon?.code || null,
        },
        email: customer.email,
      });
      if (!whatsappLink) {
        throw new Error('Nao foi possivel montar o link do WhatsApp para este pedido.');
      }
      openWhatsApp(whatsappLink);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao finalizar pedido via WhatsApp.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePixCheckout = async () => {
    // Impede checkout se o usuÃ¡rio nÃ£o estiver autenticado. Esse check
    // complementa a validaÃ§Ã£o feita ao abrir o formulÃ¡rio, garantindo que
    // requisiÃ§Ãµes programÃ¡ticas tambÃ©m sejam bloqueadas.
    if (!clientSession) {
      toast.error('VocÃª precisa estar logado para finalizar o pedido.');
      return;
    }
    if (!canCheckout || !validateCheckoutData()) return;

    setIsCheckingOut(true);
    try {
      await trackClientEvent({
        eventName: 'checkout_started',
        page: '/checkout',
        metadata: {
          paymentMethod: 'pix',
          total: finalTotal,
          itemCount,
        },
        email: customer.email,
      });

      const response = await authorizedFetch('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonymousId: getAnonymousVisitorId(),
          cliente: customer,
          endereco: address,
          itens: orderItems,
          subtotal,
          desconto_valor: discount + couponDiscount,
          desconto_percentual: discount > 0 ? BUSINESS_RULES.discountPercentage : 0,
          total: finalTotal,
          original_total: total,
          tipo_catalogo: catalogType,
          cpf_cnpj: customer.cpf_cnpj || null,
          coupon_code: appliedCoupon?.code || null,
          coupon_discount_type: appliedCoupon?.discountType || null,
          coupon_discount_value: couponDiscount,
          abandoned_cart_id: abandonedCartId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao gerar o Pix.');

      setPixOrderSnapshot({
        customer: { ...customer },
        address: { ...address },
        items: orderItems.map((item) => ({
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        catalogType: catalogType!,
        subtotal,
        discount: discount + couponDiscount,
        total: finalTotal,
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

      toast.success('Pix gerado com sucesso. Pague e aguarde a confirmaÃ§Ã£o automÃ¡tica.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao gerar o Pix.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const buildOrderWhatsAppLink = () => {
    if (!pixPayment || !pixOrderSnapshot) return null;

    return getOrderWhatsAppLink({
      orderNumber: pixPayment.numero_pedido,
      catalogType: pixOrderSnapshot.catalogType,
      items: pixOrderSnapshot.items.map((item) => ({
        name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      })),
      subtotal: pixOrderSnapshot.subtotal,
      discount: pixOrderSnapshot.discount,
      total: pixOrderSnapshot.total,
      address: pixOrderSnapshot.address,
      customer: pixOrderSnapshot.customer,
      paymentMethod: 'pix',
      status_pagamento: pixPayment.status_pagamento,
      status_pedido: pixPayment.status_pagamento === 'approved' ? 'confirmado' : 'aguardando_pagamento',
    }, COMPANY_INFO.whatsapp);
  };

  const handleCopyPix = async () => {
    if (!pixPayment?.pix_copia_cola) return;
    try {
      await navigator.clipboard.writeText(pixPayment.pix_copia_cola);
      toast.success('CÃ³digo Pix copiado.');
    } catch {
      toast.error('NÃ£o foi possÃ­vel copiar o cÃ³digo Pix.');
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

      <SheetContent className="w-full sm:max-w-md flex flex-col h-[100svh] max-h-[100svh] sm:h-[100dvh] sm:max-h-[100dvh] p-0 overflow-hidden">
        <SheetHeader className="px-4 pt-6 pb-2 shrink-0 border-b sm:px-6">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {pixPayment ? 'Pagamento Pix' : `Carrinho (${itemCount})`}
          </SheetTitle>
          <div className="pt-3">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Progresso</span>
              <span>{checkoutProgress}%</span>
            </div>
            <Progress value={checkoutProgress} className="h-2" />
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="px-4 py-4 pb-6 space-y-4 sm:px-6">
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
                    <div className="rounded-lg border p-3 text-xs break-all">{pixPayment.pix_copia_cola || 'CÃ³digo indisponÃ­vel.'}</div>
                    <Button variant="outline" className="w-full" onClick={handleCopyPix} disabled={!pixPayment.pix_copia_cola}>
                      <Copy className="h-4 w-4 mr-2" /> Copiar cÃ³digo Pix
                    </Button>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3 text-sm">
                    <p className="font-medium">Status automÃ¡tico</p>
                    <p className="text-muted-foreground">ApÃ³s o pagamento, o Mercado Pago envia o webhook e o pedido Ã© liberado automaticamente.</p>
                    <div className="rounded-lg border border-dashed p-3">
                      <p className="font-medium">Status para envio no WhatsApp</p>
                      <p className="mt-1 text-muted-foreground">
                        {getOrderWhatsAppStatusText({
                          status_pagamento: pixPayment.status_pagamento,
                          status_pedido: pixPayment.status_pagamento === 'approved' ? 'confirmado' : 'aguardando_pagamento',
                        })}
                      </p>
                    </div>
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
                        setPostPurchaseSuggestions(cartSuggestions.slice(0, 3));
                        clearCart();
                        await clearAbandonedCart('converted');
                        toast.success('Pagamento jÃ¡ aprovado.');
                      } else {
                        toast('Pagamento ainda nÃ£o aprovado.');
                      }
                    }}>
                      {isPollingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Atualizar status agora
                    </Button>

                    <Button
                      variant={pixApproved ? 'default' : 'outline'}
                      className={`w-full ${pixApproved ? 'bg-green-500 text-black hover:bg-green-500/90' : ''}`}
                      onClick={() => {
                        const whatsappLink = buildOrderWhatsAppLink();
                        if (!whatsappLink) {
                          toast.error('Nao foi possivel montar o link do WhatsApp para este pedido.');
                          return;
                        }
                        openWhatsApp(whatsappLink);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {getOrderWhatsAppActionLabel({
                        status_pagamento: pixPayment.status_pagamento,
                        status_pedido: pixPayment.status_pagamento === 'approved' ? 'confirmado' : 'aguardando_pagamento',
                      })}
                    </Button>

                    {pixApproved && (
                      <div className="space-y-2">
                        <Button className="w-full bg-neon-blue text-black hover:bg-neon-blue/90" onClick={() => {
                          resetCheckout();
                          setIsOpen(false);
                        }}>
                          Pedido pago. Fechar checkout
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => {
                          window.location.href = '/meus-pedidos';
                        }}>
                          Ver meus pedidos
                        </Button>
                        <div className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">Pos-compra forte</p>
                          <p className="mt-1 text-muted-foreground">
                            Compartilhe no WhatsApp, acompanhe o pedido e volte para aproveitar a proxima reposicao.
                          </p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-neon-blue" />
                            <p className="font-medium">Sugestoes para sua proxima compra</p>
                          </div>
                          {postPurchaseSuggestions.length > 0 ? (
                            <div className="space-y-2">
                              {postPurchaseSuggestions.map((product) => (
                                <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium line-clamp-1">{product.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatPrice(product.preco_promocional_unitario || product.preco_promocional_caixa || product.preco_unitario || product.preco_caixa || 0)}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    window.location.href = `/produto/${product.slug}`;
                                  }}>
                                    Ver produto
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                              Quando a IA tiver mais sinais do pedido aprovado, este bloco vai sugerir a recompra ideal automaticamente.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : !showCheckoutForm ? (
                <>
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-emerald-500 p-2 text-black">
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {recentlyAddedProductName ? `${recentlyAddedProductName} foi adicionado ao carrinho.` : 'Seu carrinho esta pronto para o proximo passo.'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Continue navegando pelo catalogo ou siga direto para o checkout sem perder os itens ja adicionados.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Badge variant={catalogType === 'UNITARIO' ? 'default' : 'secondary'}>
                      {catalogType === 'UNITARIO' ? 'CatÃ¡logo UnitÃ¡rio' : 'Caixa Fechada'}
                    </Badge>
                  </div>

                  {catalogType === 'UNITARIO' && !canCheckout && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-500">Pedido mÃ­nimo nÃ£o atingido</p>
                        <p className="text-muted-foreground">Faltam {formatPrice(remainingForMinOrder)} para atingir o pedido mÃ­nimo de {formatPrice(BUSINESS_RULES.minOrderValue)}.</p>
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

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-neon-blue" />
                      <p className="font-medium">Leve mais por menos</p>
                    </div>
                    {cartSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        {cartSuggestions.slice(0, 2).map((product) => (
                          <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{product.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.tipo_catalogo === 'CAIXA_FECHADA' ? 'Caixa fechada' : 'Unitario'} • {formatPrice(product.preco_promocional_unitario || product.preco_promocional_caixa || product.preco_unitario || product.preco_caixa || 0)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const type = product.tipo_catalogo === 'CAIXA_FECHADA' ? 'CAIXA_FECHADA' : 'UNITARIO';
                                const result = useCart.getState().addItem(product, 1, type);
                                if (!result.success) {
                                  toast.error(result.message || 'Nao foi possivel adicionar o upsell.');
                                }
                              }}
                            >
                              Adicionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        As recomendacoes inteligentes aparecem aqui quando o carrinho ja tiver contexto suficiente de itens e comportamento.
                      </div>
                    )}
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
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cupom {appliedCoupon?.code}</span>
                        <span className="text-green-500">-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-neon-blue">{formatPrice(finalTotal)}</span>
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

                  {clientSession && (
                    <div className="rounded-xl border border-neon-blue/20 bg-neon-blue/5 p-4 text-sm">
                      <p className="font-medium text-neon-blue">Dados reaproveitados da sua conta</p>
                      <p className="mt-1 text-muted-foreground">
                        Preenchemos automaticamente os dados salvos no cadastro. Ajuste apenas o que quiser alterar antes de finalizar.
                      </p>
                    </div>
                  )}

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
                    <h4 className="font-semibold">EndereÃ§o de entrega</h4>
                    <div className="grid gap-2">
                      <Label>CEP *</Label>
                      <Input
                        value={address.cep}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5, 8)}`;
                          markAddressAsEdited();
                          setAddress((prev) => ({ ...prev, cep: value }));
                          if (value.replace(/\D/g, '').length < 8) setLastFetchedCep('');
                        }}
                        placeholder="00000-000"
                        inputMode="numeric"
                      />
                      {isFetchingCep && <p className="text-xs text-muted-foreground">Buscando endereÃ§o pelo CEP...</p>}
                      {cepError && <p className="text-xs text-red-500">{cepError}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="col-span-2 grid gap-2">
                        <Label>Rua *</Label>
                        <Input value={address.rua} onChange={(e) => {
                          markAddressAsEdited();
                          setAddress((prev) => ({ ...prev, rua: e.target.value }));
                        }} placeholder="Nome da rua" />
                      </div>
                      <div className="grid gap-2">
                        <Label>NÃºmero *</Label>
                        <Input ref={numberInputRef} value={address.numero} onChange={(e) => {
                          markAddressAsEdited();
                          setAddress((prev) => ({ ...prev, numero: e.target.value }));
                        }} placeholder="123" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Bairro *</Label>
                      <Input value={address.bairro} onChange={(e) => {
                        markAddressAsEdited();
                        setAddress((prev) => ({ ...prev, bairro: e.target.value }));
                      }} placeholder="Nome do bairro" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="col-span-2 grid gap-2">
                        <Label>Cidade *</Label>
                        <Input value={address.cidade} onChange={(e) => {
                          markAddressAsEdited();
                          setAddress((prev) => ({ ...prev, cidade: e.target.value }));
                        }} placeholder="SÃ£o Paulo" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Estado *</Label>
                        <Input value={address.estado} onChange={(e) => {
                          markAddressAsEdited();
                          setAddress((prev) => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }));
                        }} placeholder="SP" maxLength={2} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Complemento</Label>
                      <Input value={address.complemento} onChange={(e) => {
                        markAddressAsEdited();
                        setAddress((prev) => ({ ...prev, complemento: e.target.value }));
                      }} placeholder="Apto, bloco, referÃªncia..." />
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <TicketPercent className="h-4 w-4 text-neon-blue" />
                      <h4 className="font-semibold">Cupom</h4>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Digite seu cupom"
                      />
                      {appliedCoupon ? (
                        <Button type="button" variant="outline" onClick={removeCoupon}>
                          Remover
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" onClick={applyCoupon} disabled={isApplyingCoupon}>
                          {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border p-3 text-sm">
                      {appliedCoupon ? (
                        <p className="text-green-500">
                          {appliedCoupon.label}: desconto de {formatPrice(couponDiscount)} aplicado no total.
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          Cupons inteligentes cobrem primeira compra, recompra, ticket minimo e recuperacao de carrinho.
                        </p>
                      )}
                      {couponFeedback && (
                        <p className={`mt-2 ${appliedCoupon ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {couponFeedback}
                        </p>
                      )}
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
                        <p className="text-xs text-muted-foreground mt-1">MantÃ©m o fluxo atual de pedido pelo WhatsApp.</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {!pixPayment && (
          <SheetFooter className="sticky bottom-0 z-10 border-t shrink-0 bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
            {!showCheckoutForm ? (
              <div className="w-full space-y-3">
                <div className="rounded-lg border border-neon-blue/15 bg-neon-blue/5 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">Escolha o proximo passo</p>
                  <p className="mt-1 text-muted-foreground">
                    Continue comprando para voltar ao catalogo ou siga agora para finalizar seu pedido.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="w-full"
                  >
                    Continuar comprando
                  </Button>
                  <Button
                    type="button"
                    onClick={openCheckoutStep}
                    disabled={!canCheckout || isHydratingCheckout}
                    className="w-full bg-neon-blue text-black hover:bg-neon-blue/90"
                  >
                    {isHydratingCheckout ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {isHydratingCheckout ? 'Carregando seus dados' : 'Finalizar compra'}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    clearCart();
                    await clearAbandonedCart('recovered');
                  }}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar carrinho
                </Button>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                <div className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total do pedido</span>
                    <span className="font-semibold text-neon-blue">{formatPrice(finalTotal)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs text-green-500">
                      <span>Cupom {appliedCoupon?.code}</span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                </div>
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
                    O pagamento fica vinculado por <code>external_reference = numero_pedido</code> e confirmado sÃ³ pelo webhook.
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


