import { createRequiredServerClient } from '@/lib/supabase/client';

export type CouponType =
  | 'FIRST_PURCHASE'
  | 'RECURRENT'
  | 'ABANDONED_CART'
  | 'MIN_TICKET'
  | 'GLOBAL';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export type CouponRecord = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: CouponType;
  discount_type: CouponDiscountType;
  discount_value: number;
  minimum_order_value?: number | null;
  max_discount_value?: number | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  per_user_limit?: number | null;
  product_ids?: string[] | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean | null;
};

export type CouponItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type CouponValidationInput = {
  code: string;
  userId?: string | null;
  email?: string | null;
  items: CouponItem[];
  subtotal: number;
  total: number;
  abandonedCartId?: string | null;
};

export type CouponValidationResult = {
  valid: boolean;
  message: string;
  coupon?: CouponRecord;
  discountValue?: number;
  applicableSubtotal?: number;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function getApplicableSubtotal(coupon: CouponRecord, items: CouponItem[]) {
  const productIds = coupon.product_ids || [];
  if (!productIds.length) {
    return items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  }

  return items
    .filter((item) => productIds.includes(item.product_id))
    .reduce((sum, item) => sum + Number(item.total_price || 0), 0);
}

function calculateDiscount(coupon: CouponRecord, applicableSubtotal: number) {
  if (applicableSubtotal <= 0) return 0;

  if (coupon.discount_type === 'PERCENTAGE') {
    const rawDiscount = applicableSubtotal * (Number(coupon.discount_value || 0) / 100);
    if (coupon.max_discount_value && rawDiscount > Number(coupon.max_discount_value)) {
      return Number(coupon.max_discount_value);
    }
    return rawDiscount;
  }

  return Math.min(Number(coupon.discount_value || 0), applicableSubtotal);
}

export async function fetchCouponByCode(code: string) {
  const db = createRequiredServerClient() as any;
  const { data, error } = await db
    .from('coupons')
    .select('*')
    .eq('code', normalizeCode(code))
    .maybeSingle();

  if (error) throw error;
  return (data || null) as CouponRecord | null;
}

export async function validateCoupon(input: CouponValidationInput): Promise<CouponValidationResult> {
  const db = createRequiredServerClient() as any;
  const coupon = await fetchCouponByCode(input.code);
  const email = normalizeEmail(input.email);

  if (!coupon || !coupon.is_active) {
    return { valid: false, message: 'Cupom inexistente ou inativo.' };
  }

  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    return { valid: false, message: 'Cupom ainda não está disponível.' };
  }

  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
    return { valid: false, message: 'Cupom expirado.' };
  }

  const applicableSubtotal = getApplicableSubtotal(coupon, input.items);
  if (applicableSubtotal <= 0) {
    return { valid: false, message: 'Cupom não se aplica aos produtos do carrinho.' };
  }

  const minimumOrderValue = Number(coupon.minimum_order_value || 0);
  if (minimumOrderValue > 0 && Number(input.total || 0) < minimumOrderValue) {
    return {
      valid: false,
      message: `Pedido mínimo para este cupom: R$ ${minimumOrderValue.toFixed(2)}.`,
    };
  }

  if (coupon.usage_limit && Number(coupon.usage_count || 0) >= Number(coupon.usage_limit)) {
    return { valid: false, message: 'Cupom esgotado.' };
  }

  if (coupon.per_user_limit && (input.userId || email)) {
    let redemptionQuery = db
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id);

    if (input.userId) {
      redemptionQuery = redemptionQuery.eq('user_id', input.userId);
    } else if (email) {
      redemptionQuery = redemptionQuery.eq('email', email);
    }

    const { count } = await redemptionQuery;
    if ((count || 0) >= Number(coupon.per_user_limit)) {
      return { valid: false, message: 'Este cupom já foi utilizado no limite permitido.' };
    }
  }

  if (coupon.type === 'FIRST_PURCHASE') {
    const orderQuery = db
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .in('status_pagamento', ['approved', 'pending']);

    const scopedOrderQuery = input.userId
      ? orderQuery.eq('user_id', input.userId)
      : email
        ? orderQuery.eq('cliente_email', email)
        : null;

    if (!scopedOrderQuery) {
      return { valid: false, message: 'Faça login para usar o cupom de primeira compra.' };
    }

    const { count } = await scopedOrderQuery;
    if ((count || 0) > 0) {
      return { valid: false, message: 'Cupom disponível somente para primeira compra.' };
    }
  }

  if (coupon.type === 'RECURRENT') {
    const orderQuery = db
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('status_pagamento', 'approved');

    const scopedOrderQuery = input.userId
      ? orderQuery.eq('user_id', input.userId)
      : email
        ? orderQuery.eq('cliente_email', email)
        : null;

    if (!scopedOrderQuery) {
      return { valid: false, message: 'Faça login para usar o cupom de recompra.' };
    }

    const { count } = await scopedOrderQuery;
    if ((count || 0) === 0) {
      return { valid: false, message: 'Cupom disponível apenas para clientes recorrentes.' };
    }
  }

  if (coupon.type === 'ABANDONED_CART') {
    const abandonedCartId = input.abandonedCartId || null;
    if (!abandonedCartId) {
      return { valid: false, message: 'Cupom disponível apenas para recuperação de carrinho.' };
    }

    const abandonedQuery = db
      .from('abandoned_carts')
      .select('id,status')
      .eq('id', abandonedCartId)
      .eq('status', 'abandoned');

    const scopedAbandonedQuery = input.userId
      ? abandonedQuery.eq('user_id', input.userId)
      : email
        ? abandonedQuery.eq('email', email)
        : null;

    if (!scopedAbandonedQuery) {
      return { valid: false, message: 'Cupom disponível apenas para recuperação autenticada.' };
    }

    const { data: abandoned } = await scopedAbandonedQuery.maybeSingle();
    if (!abandoned) {
      return { valid: false, message: 'Carrinho abandonado não encontrado para este cupom.' };
    }
  }

  const discountValue = Number(calculateDiscount(coupon, applicableSubtotal).toFixed(2));
  if (discountValue <= 0) {
    return { valid: false, message: 'Cupom sem desconto aplicável ao carrinho atual.' };
  }

  return {
    valid: true,
    message: 'Cupom aplicado com sucesso.',
    coupon,
    discountValue,
    applicableSubtotal,
  };
}

export async function registerCouponRedemption(args: {
  couponCode: string;
  orderId: string;
  userId?: string | null;
  email?: string | null;
  discountValue: number;
}) {
  const db = createRequiredServerClient() as any;
  const coupon = await fetchCouponByCode(args.couponCode);
  if (!coupon) return null;

  await db.from('coupon_redemptions').insert({
    coupon_id: coupon.id,
    order_id: args.orderId,
    user_id: args.userId || null,
    email: normalizeEmail(args.email),
    coupon_code: coupon.code,
    discount_value: Number(args.discountValue || 0),
  });

  await db
    .from('coupons')
    .update({
      usage_count: Number(coupon.usage_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coupon.id);

  return coupon;
}
