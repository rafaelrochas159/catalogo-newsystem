import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import {
  createPixPayment,
  generateCheckoutToken,
  generateOrderNumber,
  mapMercadoPagoStatus,
  splitName,
} from '@/lib/services/mercadoPago';

interface CheckoutBody {
  cliente: {
    nome: string;
    telefone: string;
    email: string;
    cpf_cnpj?: string | null;
  };
  endereco: {
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    complemento?: string;
  };
  itens: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    type: string;
  }>;
  subtotal: number;
  desconto_valor: number;
  desconto_percentual: number;
  total: number;
  tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA';
  /** CPF ou CNPJ informado pelo cliente, enviado separadamente para conveniência */
  cpf_cnpj?: string | null;
}

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function normalizeItems(items: CheckoutBody['itens']) {
  return items.map((item) => ({
    product_id: String(item.product_id),
    product_name: String(item.product_name),
    sku: String(item.sku),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
    type: String(item.type),
  }));
}

function validateBody(body: CheckoutBody) {
  if (!body?.cliente?.email || !body?.cliente?.nome || !body?.cliente?.telefone) {
    return 'Nome, telefone e e-mail são obrigatórios.';
  }

  if (!body?.endereco?.cep || !body?.endereco?.rua || !body?.endereco?.numero || !body?.endereco?.bairro || !body?.endereco?.cidade || !body?.endereco?.estado) {
    return 'Endereço incompleto.';
  }

  if (!Array.isArray(body?.itens) || body.itens.length === 0) {
    return 'Carrinho vazio.';
  }

  if (!body.tipo_catalogo || !['UNITARIO', 'CAIXA_FECHADA'].includes(body.tipo_catalogo)) {
    return 'Tipo de catálogo inválido.';
  }

  if (!Number.isFinite(body.total) || body.total <= 0) {
    return 'Valor total inválido.';
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const errorMessage = validateBody(body);
    if (errorMessage) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const db = createRequiredServerClient() as any;
    const itens = normalizeItems(body.itens);
    const numeroPedido = generateOrderNumber();
    const checkoutToken = generateCheckoutToken();
    const baseUrl = getBaseUrl(request);
    const { firstName, lastName } = splitName(body.cliente.nome);

    const pedidoInsert = {
      numero_pedido: numeroPedido,
      checkout_token: checkoutToken,
      cliente_nome: body.cliente.nome,
      cliente_telefone: body.cliente.telefone,
      cliente_email: body.cliente.email,
      cliente_cpf_cnpj: body.cliente.cpf_cnpj || body.cpf_cnpj || null,
      tipo_catalogo: body.tipo_catalogo,
      subtotal: Number(body.subtotal),
      desconto_valor: Number(body.desconto_valor || 0),
      desconto_percentual: Number(body.desconto_percentual || 0),
      total: Number(body.total),
      itens,
      endereco: body.endereco,
      status: 'pending',
      status_pedido: 'aguardando_pagamento',
      status_pagamento: 'pending',
      forma_pagamento: 'pix',
      gateway: 'mercadopago',
      external_reference: numeroPedido,
      whatsapp_enviado: false,
    };

    const { data: pedido, error: pedidoError } = await db
      .from('pedidos')
      .insert(pedidoInsert)
      .select('*')
      .single();

    if (pedidoError || !pedido) {
      throw new Error(pedidoError?.message || 'Não foi possível criar o pedido.');
    }

    await db.from('compradores_acesso').upsert({
      email: body.cliente.email,
      nome: body.cliente.nome,
      telefone: body.cliente.telefone,
      ultimo_numero_pedido: numeroPedido,
      acesso_liberado: false,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'email' });

    let payment;
    try {
      payment = await createPixPayment({
        transactionAmount: Number(body.total),
        description: `Pedido ${numeroPedido} - NEW SYSTEM`,
        externalReference: numeroPedido,
        notificationUrl: `${baseUrl}/api/webhooks/mercadopago`,
        payer: {
          email: body.cliente.email,
          firstName,
          lastName,
        },
        items: itens.map((item) => ({
          id: item.product_id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        idempotencyKey: `${numeroPedido}:pix`,
      });
    } catch (paymentError: any) {
      await db.from('pedidos').update({
        status_pedido: 'erro_pagamento',
        status_pagamento: 'error',
        status_gateway_detalhe: paymentError?.message || 'Falha ao gerar Pix',
        updated_at: new Date().toISOString(),
      }).eq('id', pedido.id);

      throw paymentError;
    }

    const mapped = mapMercadoPagoStatus(payment.status);
    const qrCode = payment.point_of_interaction?.transaction_data?.qr_code || null;
    const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    // Armazenamos o status normalizado no registro de pagamentos para manter
    // consistência com a tabela de pedidos. O campo raw `payment.status` pode
    // conter valores como 'authorized' ou 'in_process', mas o frontend
    // utiliza apenas 'approved', 'pending' e 'cancelled'.
    await db.from('pagamentos').upsert({
      pedido_id: pedido.id,
      numero_pedido: numeroPedido,
      gateway: 'mercadopago',
      forma_pagamento: 'pix',
      payment_id_gateway: String(payment.id),
      external_reference: numeroPedido,
      qr_code: qrCodeBase64,
      pix_copia_cola: qrCode,
      status_pagamento: mapped.statusPagamento,
      valor: Number(body.total),
      payload_gateway: payment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'payment_id_gateway' });

    // Atualiza o pedido com os dados do pagamento e o status normalizado
    await db.from('pedidos').update({
      payment_id_gateway: String(payment.id),
      external_reference: numeroPedido,
      pix_qr_code: qrCodeBase64,
      pix_copia_cola: qrCode,
      status_pagamento: mapped.statusPagamento,
      status_pedido: mapped.statusPedido,
      status: mapped.statusLegado,
      status_gateway_detalhe: payment.status_detail || null,
      payment_gateway_response: payment,
      updated_at: new Date().toISOString(),
    }).eq('id', pedido.id);

    return NextResponse.json({
      success: true,
      numero_pedido: numeroPedido,
      checkout_token: checkoutToken,
      pedido_id: pedido.id,
      valor: Number(body.total),
      // Expose a normalized payment status to the client. The raw status from
      // Mercado Pago can be values like 'in_process', 'authorized', etc.
      // Using the mapped value ensures the frontend only has to check for
      // 'approved' versus other states.
      status_pagamento: mapped.statusPagamento,
      payment_id_gateway: String(payment.id),
      external_reference: numeroPedido,
      qr_code_base64: qrCodeBase64,
      pix_copia_cola: qrCode,
    });
  } catch (error: any) {
    console.error('Erro ao gerar Pix:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar pagamento Pix.' },
      { status: 500 }
    );
  }
}
