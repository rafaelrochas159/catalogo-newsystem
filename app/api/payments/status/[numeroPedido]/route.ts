import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { getApprovedAt, getPaymentById, mapMercadoPagoStatus, getPaymentByExternalReference } from '@/lib/services/mercadoPago';
import { getAuthenticatedUserFromRequest, requireAdminRequest } from '@/lib/auth/server';

interface Params {
  params: {
    numeroPedido: string;
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const db = createRequiredServerClient() as any;
    const reference = decodeURIComponent(params.numeroPedido);
    const adminSession = await requireAdminRequest(_request);
    const { user } = adminSession ? { user: null } : await getAuthenticatedUserFromRequest(_request);

    let pedido: any = null;
    let matchedByCheckoutToken = false;

    const byToken = await db
      .from('pedidos')
      .select('*')
      .eq('checkout_token', reference)
      .maybeSingle();

    if (byToken.data) {
      pedido = byToken.data;
      matchedByCheckoutToken = true;
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

    if (!matchedByCheckoutToken && !adminSession) {
      const normalizedOrderEmail = pedido.cliente_email?.trim().toLowerCase();
      const normalizedUserEmail = user?.email?.trim().toLowerCase();

      if (!normalizedUserEmail) {
        return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 });
      }

      if (!normalizedOrderEmail || normalizedOrderEmail !== normalizedUserEmail) {
        return NextResponse.json({ error: 'Acesso negado ao pedido informado.' }, { status: 403 });
      }
    }

    /*
     * Fallback ativo: se o webhook ainda não atualizou o banco, a rota consulta o
     * Mercado Pago diretamente e sincroniza o pedido. Há duas situações a
     * considerar:
     *
     * 1. O pedido possui um `payment_id_gateway` porém o status não é `approved`. Isso
     *    pode acontecer quando o webhook atrasou ou falhou. Neste caso
     *    buscamos o pagamento pelo ID.
     * 2. O pedido não possui um `payment_id_gateway` (por algum erro de
     *    persistência), mas ainda assim já existe um pagamento gerado no
     *    Mercado Pago (identificado pelo `external_reference`). Neste caso
     *    buscamos o pagamento pela referência externa.
     */
    if ((pedido.payment_id_gateway && pedido.status_pagamento !== 'approved') || (!pedido.payment_id_gateway)) {
      try {
        let payment: any = null;
        if (pedido.payment_id_gateway) {
          payment = await getPaymentById(String(pedido.payment_id_gateway));
        } else {
          // Quando não há payment_id_gateway salvo, tenta localizar o pagamento
          // usando o número do pedido (external_reference) diretamente na API.
          payment = await getPaymentByExternalReference(pedido.numero_pedido);
        }

        if (payment) {
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
            // Armazena o status normalizado para evitar divergências entre tabelas
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
              payment_id_gateway: String(payment.id),
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

          // Atualiza o objeto local para refletir possíveis mudanças
          if (updatedPedido) {
            pedido = updatedPedido;
          } else {
            pedido = {
              ...pedido,
              status_pagamento: mapped.statusPagamento,
              status_pedido: mapped.statusPedido,
              status: mapped.statusLegado,
              paid_at: approvedAt,
              payment_id_gateway: String(payment.id),
              external_reference: payment.external_reference || pedido.numero_pedido,
              pix_qr_code: qrCodeBase64,
              pix_copia_cola: qrCode,
              payment_gateway_response: payment,
            };
          }
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
