import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import {
  buildApprovedOrderNotificationMessage,
  buildCustomerConfirmationMessage,
  sendAutomatedWhatsAppMessage,
} from '@/lib/whatsapp';

function isInternalAuthorized(request: Request) {
  const secret = process.env.INTERNAL_AUTOMATION_SECRET;
  if (!secret) return false;
  return request.headers.get('x-internal-automation-secret') === secret;
}

export async function POST(request: Request) {
  try {
    const adminSession = await requireAdminRequest(request);
    if (!adminSession && !isInternalAuthorized(request)) {
      return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const db = createRequiredServerClient() as any;
    let message = String(body.message || '');
    let phone = String(body.phone || '');
    let orderId = body.orderId ? String(body.orderId) : null;
    const templateKey = String(body.templateKey || 'manual_message');

    if (orderId && (!message || !phone)) {
      const { data: order } = await db
        .from('pedidos')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) {
        return NextResponse.json({ error: 'Pedido nao encontrado.' }, { status: 404 });
      }

      phone = phone || String(body.audience === 'customer' ? order.cliente_telefone || '' : process.env.WHATSAPP_NOTIFICATIONS_PHONE || '');
      message = message || (
        body.audience === 'customer'
          ? buildCustomerConfirmationMessage(order)
          : buildApprovedOrderNotificationMessage(order)
      );
    }

    if (!phone || !message) {
      return NextResponse.json({ error: 'Telefone e mensagem sao obrigatorios.' }, { status: 400 });
    }

    const result = await sendAutomatedWhatsAppMessage({
      phone,
      message,
      templateKey,
      dedupeKey: String(body.dedupeKey || `${templateKey}:${orderId || phone}:${Date.now()}`),
      orderId,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao enviar mensagem.' },
      { status: 500 },
    );
  }
}
