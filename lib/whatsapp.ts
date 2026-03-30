import { COMPANY_INFO } from '@/lib/constants';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { generateProfessionalOrderMessage } from '@/lib/utils';

type SendWhatsAppMessageInput = {
  phone: string;
  message: string;
  templateKey: string;
  dedupeKey: string;
  orderId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

type ProviderResponse = {
  providerMessageId?: string | null;
  response?: unknown;
};

function normalizePhone(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function getProvider() {
  return process.env.WHATSAPP_PROVIDER || 'meta';
}

async function sendWithMeta(phone: string, message: string): Promise<ProviderResponse> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API nao configurada.');
  }

  const response = await fetch(
    `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0'}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      }),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Falha ao enviar mensagem pelo WhatsApp Cloud API.');
  }

  return {
    providerMessageId: data?.messages?.[0]?.id || null,
    response: data,
  };
}

async function sendWithWebhook(phone: string, message: string, templateKey: string): Promise<ProviderResponse> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('Webhook de WhatsApp nao configurado.');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.WHATSAPP_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.WHATSAPP_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      phone,
      message,
      templateKey,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Falha ao enviar mensagem para o provedor de WhatsApp.');
  }

  return {
    providerMessageId: data?.messageId || null,
    response: data,
  };
}

async function logQueuedMessage(db: any, input: SendWhatsAppMessageInput, phone: string) {
  const existing = await db
    .from('whatsapp_message_logs')
    .select('id, status')
    .eq('dedupe_key', input.dedupeKey)
    .maybeSingle();

  if (existing.data?.id && ['queued', 'sent'].includes(existing.data.status)) {
    return { skip: true as const, logId: existing.data.id };
  }

  const { data, error } = await db
    .from('whatsapp_message_logs')
    .upsert(
      {
        user_id: input.userId || null,
        order_id: input.orderId || null,
        phone,
        template_key: input.templateKey,
        dedupe_key: input.dedupeKey,
        provider: getProvider(),
        direction: 'outbound',
        status: 'queued',
        payload: {
          message: input.message,
          metadata: input.metadata || {},
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'dedupe_key' },
    )
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return { skip: false as const, logId: data.id as string };
}

export async function sendAutomatedWhatsAppMessage(input: SendWhatsAppMessageInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { status: 'skipped', reason: 'phone-missing' } as const;
  }

  const db = createRequiredServerClient() as any;
  const queueResult = await logQueuedMessage(db, input, phone);
  if (queueResult.skip) {
    return { status: 'skipped', reason: 'duplicate' } as const;
  }

  try {
    const providerResponse = getProvider() === 'webhook'
      ? await sendWithWebhook(phone, input.message, input.templateKey)
      : await sendWithMeta(phone, input.message);

    await db
      .from('whatsapp_message_logs')
      .update({
        status: 'sent',
        provider_message_id: providerResponse.providerMessageId || null,
        response: providerResponse.response || null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueResult.logId);

    return { status: 'sent', providerMessageId: providerResponse.providerMessageId || null } as const;
  } catch (error: any) {
    await db
      .from('whatsapp_message_logs')
      .update({
        status: 'failed',
        response: {
          error: error?.message || 'Falha ao enviar mensagem.',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueResult.logId);

    return { status: 'failed', reason: error?.message || 'send-failed' } as const;
  }
}

function normalizeOrderItems(order: any) {
  return Array.isArray(order?.itens)
    ? order.itens.map((item: any) => ({
        name: item.product_name || item.nome || 'Produto',
        sku: item.sku || '-',
        quantity: Number(item.quantity || item.quantidade || 0),
        unitPrice: Number(item.unit_price || item.preco_unitario || 0),
        totalPrice: Number(item.total_price || item.preco_total || 0),
      }))
    : [];
}

export function buildApprovedOrderNotificationMessage(order: any) {
  return generateProfessionalOrderMessage({
    orderNumber: order.numero_pedido,
    catalogType: order.tipo_catalogo || 'UNITARIO',
    items: normalizeOrderItems(order),
    subtotal: Number(order.subtotal || order.total || 0),
    discount: Number(order.desconto_valor || order.coupon_discount_value || 0),
    total: Number(order.total || 0),
    address: order.endereco || undefined,
    customer: {
      nome: order.cliente_nome || '',
      telefone: order.cliente_telefone || '',
      email: order.cliente_email || '',
      cpf_cnpj: order.cliente_cpf_cnpj || null,
    },
    paymentMethod: 'Pix aprovado',
  });
}

export function buildCustomerConfirmationMessage(order: any) {
  return [
    `Pedido ${order.numero_pedido} aprovado com sucesso.`,
    'Pagamento Pix confirmado.',
    `Total: R$ ${Number(order.total || 0).toFixed(2).replace('.', ',')}`,
    'A equipe da NEW SYSTEM ja recebeu sua compra e vai seguir com a confirmacao.',
    'Se precisar de suporte, responda esta mensagem.',
  ].join('\n');
}

export async function sendPostPurchaseWhatsAppNotifications(order: any) {
  const tasks: Promise<unknown>[] = [];
  const adminPhone = process.env.WHATSAPP_NOTIFICATIONS_PHONE || COMPANY_INFO.whatsapp;

  tasks.push(
    sendAutomatedWhatsAppMessage({
      phone: adminPhone,
      message: buildApprovedOrderNotificationMessage(order),
      templateKey: 'order_approved_admin',
      dedupeKey: `order-approved-admin:${order.id}`,
      orderId: order.id,
      userId: order.user_id || null,
      metadata: {
        numeroPedido: order.numero_pedido,
        audience: 'operations',
      },
    }),
  );

  if (
    process.env.WHATSAPP_SEND_CUSTOMER_CONFIRMATION === 'true' &&
    order.cliente_telefone
  ) {
    tasks.push(
      sendAutomatedWhatsAppMessage({
        phone: order.cliente_telefone,
        message: buildCustomerConfirmationMessage(order),
        templateKey: 'order_confirmation_customer',
        dedupeKey: `order-approved-customer:${order.id}`,
        orderId: order.id,
        userId: order.user_id || null,
        metadata: {
          numeroPedido: order.numero_pedido,
          audience: 'customer',
        },
      }),
    );
  }

  return Promise.allSettled(tasks);
}
