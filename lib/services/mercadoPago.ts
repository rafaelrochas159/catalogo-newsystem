import { createHmac, randomBytes, randomUUID } from 'crypto';

export interface MercadoPagoPixRequest {
  transactionAmount: number;
  description: string;
  externalReference: string;
  payer: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  notificationUrl: string;
  items?: Array<{
    id?: string;
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  statementDescriptor?: string;
  idempotencyKey?: string;
}

export interface MercadoPagoPixResponse {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount: number;
  date_created?: string;
  date_approved?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  payer?: {
    email?: string;
  };
  [key: string]: unknown;
}

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }
  return token;
}

function getApiBase() {
  return 'https://api.mercadopago.com';
}

export function splitName(fullName?: string) {
  if (!fullName?.trim()) {
    return { firstName: 'Cliente', lastName: 'NEW SYSTEM' };
  }

  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || 'Cliente',
    lastName: parts.slice(1).join(' ') || 'NEW SYSTEM',
  };
}

export function generateOrderNumber() {
  const now = new Date();
  const year = String(now.getFullYear());
  const compactDate = `${year}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomSuffix = randomBytes(3).toString('hex').toUpperCase();
  return `NS${compactDate}-${randomSuffix}`;
}

export function generateCheckoutToken() {
  return randomUUID();
}

export async function createPixPayment(input: MercadoPagoPixRequest): Promise<MercadoPagoPixResponse> {
  const accessToken = getAccessToken();
  const response = await fetch(`${getApiBase()}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.idempotencyKey || randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: Number(input.transactionAmount.toFixed(2)),
      description: input.description,
      payment_method_id: 'pix',
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      statement_descriptor: input.statementDescriptor || 'NEWSYSTEM',
      payer: {
        email: input.payer.email,
        first_name: input.payer.firstName,
        last_name: input.payer.lastName,
      },
      additional_info: input.items?.length
        ? {
            items: input.items,
          }
        : undefined,
    }),
    cache: 'no-store',
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.message || json?.error || 'Falha ao criar pagamento Pix no Mercado Pago';
    throw new Error(message);
  }

  return json as MercadoPagoPixResponse;
}

export async function getPaymentById(paymentId: string | number): Promise<MercadoPagoPixResponse> {
  const accessToken = getAccessToken();

  const response = await fetch(`${getApiBase()}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json?.message || json?.error || 'Falha ao consultar pagamento no Mercado Pago';
    throw new Error(message);
  }

  return json as MercadoPagoPixResponse;
}

export function mapMercadoPagoStatus(status?: string) {
  switch (status) {
    // Payment has been fully approved/credited.
    case 'approved':
    case 'accredited':
    case 'accredited_waiting_for_charger':
      return {
        statusPedido: 'pago',
        statusPagamento: 'approved',
        statusLegado: 'confirmed',
      };
    // Payment authorized but not yet captured. For PIX this is equivalent to approved
    // because PIX payments are immediately captured once funds are transferred.
    case 'authorized':
      return {
        statusPedido: 'pago',
        statusPagamento: 'approved',
        statusLegado: 'confirmed',
      };
    // Payment is pending or still in process of verification/mediation.
    case 'pending':
    case 'in_process':
    case 'in_mediation':
    case 'pending_contingency':
    case 'pending_review_manual':
      return {
        statusPedido: 'aguardando_pagamento',
        statusPagamento: 'pending',
        statusLegado: 'pending',
      };
    // Payment was rejected, cancelled or refunded.
    case 'rejected':
    case 'cancelled':
    case 'cancelled_by_collector':
    case 'cancelled_by_admin':
    case 'refunded':
    case 'charged_back':
    case 'partially_refunded':
      return {
        statusPedido: 'cancelado',
        statusPagamento: status || 'cancelled',
        statusLegado: 'cancelled',
      };
    default:
      // Fallback: treat unknown statuses as pending to avoid false negatives.
      return {
        statusPedido: 'aguardando_pagamento',
        statusPagamento: status || 'pending',
        statusLegado: 'pending',
      };
  }
}

export function getApprovedAt(payment: MercadoPagoPixResponse) {
  if (payment.date_approved) return payment.date_approved;
  if (payment.status === 'approved') return new Date().toISOString();
  return null;
}

export function isMercadoPagoWebhookValid(request: Request, body: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const signature = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id') || '';
  if (!signature) {
    return false;
  }

  const parts = Object.fromEntries(
    signature.split(',').map((item) => {
      const [key, value] = item.split('=');
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    return false;
  }

  let payload: any = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch {
    payload = {};
  }

  const url = new URL(request.url);
  const dataId = payload?.data?.id || url.searchParams.get('data.id') || payload?.id || url.searchParams.get('id') || '';

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  return expected === v1;
}
