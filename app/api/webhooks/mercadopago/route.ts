import { NextResponse } from 'next/server';
import { trackUserEvent } from '@/lib/marketing';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { sendPostPurchaseWhatsAppNotifications } from '@/lib/whatsapp';
import {
  getApprovedAt,
  getPaymentById,
  isMercadoPagoWebhookValid,
  mapMercadoPagoStatus,
} from '@/lib/services/mercadoPago';

function getPaymentIdFromPayload(rawBody: any, requestUrl: string) {
  if (rawBody?.data?.id) return String(rawBody.data.id);
  if (rawBody?.id && (rawBody?.type === 'payment' || rawBody?.topic === 'payment')) return String(rawBody.id);

  const url = new URL(requestUrl);
  return url.searchParams.get('data.id') || url.searchParams.get('id');
}

export async function POST(request: Request) {
  const rawText = await request.text();

  if (!isMercadoPagoWebhookValid(request, rawText)) {
    return NextResponse.json({ received: false, error: 'assinatura inválida' }, { status: 401 });
  }

  let payload: any = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }

  try {
    const paymentId = getPaymentIdFromPayload(payload, request.url);
    if (!paymentId) {
      return NextResponse.json({ received: true, ignored: 'payment_id ausente' });
    }

    const payment = await getPaymentById(paymentId);
    const numeroPedido = payment.external_reference;

    if (!numeroPedido) {
      return NextResponse.json({ received: true, ignored: 'external_reference ausente' });
    }

    const db = createRequiredServerClient() as any;
    const { data: pedido, error: pedidoError } = await db
      .from('pedidos')
      .select('*')
      .eq('numero_pedido', numeroPedido)
      .maybeSingle();

    if (pedidoError || !pedido) {
      return NextResponse.json({ received: true, ignored: 'pedido não encontrado' });
    }

    const mapped = mapMercadoPagoStatus(payment.status);
    const approvedAt = getApprovedAt(payment);

    if (pedido.status_pagamento === 'approved' && payment.status === 'approved') {
      return NextResponse.json({ received: true, skipped: 'pedido já pago' });
    }

    await db.from('pagamentos').upsert({
      pedido_id: pedido.id,
      numero_pedido: numeroPedido,
      gateway: 'mercadopago',
      forma_pagamento: 'pix',
      payment_id_gateway: String(payment.id),
      external_reference: numeroPedido,
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      pix_copia_cola: payment.point_of_interaction?.transaction_data?.qr_code || null,
      // Store the normalized status in pagamentos as well. This makes it
      // consistent with pedidos.status_pagamento and prevents mismatches.
      status_pagamento: mapped.statusPagamento,
      valor: pedido.total,
      payload_gateway: payment,
      updated_at: new Date().toISOString(),
      paid_at: approvedAt,
    }, { onConflict: 'payment_id_gateway' });

    await db.from('pedidos').update({
      status_pagamento: mapped.statusPagamento,
      status_pedido: mapped.statusPedido,
      status: mapped.statusLegado,
      paid_at: approvedAt,
      payment_id_gateway: String(payment.id),
      external_reference: numeroPedido,
      pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      pix_copia_cola: payment.point_of_interaction?.transaction_data?.qr_code || null,
      status_gateway_detalhe: payment.status_detail || null,
      payment_gateway_response: payment,
      updated_at: new Date().toISOString(),
    }).eq('id', pedido.id);

    if (payment.status === 'approved' && pedido.cliente_email) {
      await db.from('compradores_acesso').upsert({
        email: pedido.cliente_email,
        nome: pedido.cliente_nome,
        telefone: pedido.cliente_telefone,
        acesso_liberado: true,
        ultimo_numero_pedido: numeroPedido,
        liberado_em: approvedAt,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'email' });

      await trackUserEvent({
        userId: pedido.user_id || null,
        email: pedido.cliente_email,
        anonymousId: pedido.anonymous_id || null,
        eventName: 'order_completed',
        orderId: pedido.id,
        metadata: {
          numeroPedido,
          paymentMethod: 'pix',
          total: pedido.total,
        },
      });

      if (Array.isArray(pedido.itens)) {
        await Promise.all(
          pedido.itens.map((item: any) =>
            trackUserEvent({
              userId: pedido.user_id || null,
              email: pedido.cliente_email,
              anonymousId: pedido.anonymous_id || null,
              eventName: 'purchase',
              page: '/checkout',
              productId: item.product_id || item.produto_id || null,
              orderId: pedido.id,
              metadata: {
                numeroPedido,
                quantity: Number(item.quantity || item.quantidade || 1),
                price: Number(item.unit_price || item.preco_unitario || 0),
                total: Number(item.total_price || item.preco_total || pedido.total || 0),
              },
            }),
          ),
        );
      }

      await sendPostPurchaseWhatsAppNotifications(pedido);
    }

    return NextResponse.json({ received: true, payment_id: String(payment.id), numero_pedido: numeroPedido });
  } catch (error: any) {
    console.error('Erro no webhook do Mercado Pago:', error);
    return NextResponse.json({ received: false, error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
