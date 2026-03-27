import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';

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
