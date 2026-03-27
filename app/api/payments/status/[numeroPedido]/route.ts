import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { getApprovedAt, getPaymentById, mapMercadoPagoStatus } from '@/lib/services/mercadoPago';

interface Params {
  params: {
    numeroPedido: string;
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const db = createRequiredServerClient() as any;
    const reference = decodeURIComponent(params.numeroPedido);

    let pedido: any = null;

    const byToken = await db
      .from('pedidos')
      .select('*')
      .eq('checkout_token', reference)
      .maybeSingle();

    if (byToken.data) {
      pedido = byToken.data;
    } else {
      const byNumber = await db
        .from('pedidos')
        .select('*')
        .eq('numero_pedido', reference)
        .maybeSingle();

      pedido = byNumber.data;
    }

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    // Fallback ativo: se o webhook ainda não atualizou o banco,
    // a rota consulta o Mercado Pago diretamente e sincroniza o pedido.
    if (pedido.payment_id_gateway && pedido.status_pagamento !== 'approved') {
      try {
        const payment = await getPaymentById(String(pedido.payment_id_gateway));
        const mapped = mapMercadoPagoStatus(payment.status);
        const approvedAt = getApprovedAt(payment);
        const qrCode = payment.point_of_interaction?.transaction_data?.qr_code || pedido.pix_copia_cola || null;
        const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 || pedido.pix_qr_code || null;

        await db.from('pagamentos').upsert({
          pedido_id: pedido.id,
          numero_pedido: pedido.numero_pedido,
          gateway: 'mercadopago',
          forma_pagamento: pedido.forma_pagamento || 'pix',
          payment_id_gateway: String(payment.id),
          external_reference: payment.external_reference || pedido.numero_pedido,
          qr_code: qrCodeBase64,
          pix_copia_cola: qrCode,
          // Normalize the status for the pagamentos table as well. This ensures
          // consistency between pedidos.status_pagamento and pagamentos.status_pagamento.
          status_pagamento: mapped.statusPagamento,
          valor: pedido.total,
          payload_gateway: payment,
          updated_at: new Date().toISOString(),
          paid_at: approvedAt,
        }, { onConflict: 'payment_id_gateway' });

        const { data: updatedPedido } = await db
          .from('pedidos')
          .update({
            status_pagamento: mapped.statusPagamento,
            status_pedido: mapped.statusPedido,
            status: mapped.statusLegado,
            paid_at: approvedAt,
            external_reference: payment.external_reference || pedido.numero_pedido,
            pix_qr_code: qrCodeBase64,
            pix_copia_cola: qrCode,
            status_gateway_detalhe: payment.status_detail || null,
            payment_gateway_response: payment,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pedido.id)
          .select('*')
          .single();

        if (payment.status === 'approved' && pedido.cliente_email) {
          await db.from('compradores_acesso').upsert({
            email: pedido.cliente_email,
            nome: pedido.cliente_nome,
            telefone: pedido.cliente_telefone,
            acesso_liberado: true,
            ultimo_numero_pedido: pedido.numero_pedido,
            liberado_em: approvedAt,
            atualizado_em: new Date().toISOString(),
          }, { onConflict: 'email' });
        }

        if (updatedPedido) {
          pedido = updatedPedido;
        } else {
          pedido = {
            ...pedido,
            status_pagamento: mapped.statusPagamento,
            status_pedido: mapped.statusPedido,
            status: mapped.statusLegado,
            paid_at: approvedAt,
            external_reference: payment.external_reference || pedido.numero_pedido,
            pix_qr_code: qrCodeBase64,
            pix_copia_cola: qrCode,
            payment_gateway_response: payment,
          };
        }
      } catch (syncError) {
        console.error('Falha ao sincronizar status diretamente no Mercado Pago:', syncError);
      }
    }

    return NextResponse.json({
      numero_pedido: pedido.numero_pedido,
      checkout_token: pedido.checkout_token || null,
      status_pedido: pedido.status_pedido || pedido.status,
      status_pagamento: pedido.status_pagamento || 'pending',
      paid_at: pedido.paid_at || null,
      pix_copia_cola: pedido.pix_copia_cola || null,
      qr_code_base64: pedido.pix_qr_code || null,
      payment_id_gateway: pedido.payment_id_gateway || null,
      forma_pagamento: pedido.forma_pagamento || null,
      total: pedido.total,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno.' }, { status: 500 });
  }
}
