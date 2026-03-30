import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { getAuthenticatedUserFromRequest, requireAdminRequest } from '@/lib/auth/server';

/**
 * API Route: GET /api/pedidos/email/[email]
 *
 * Busca todos os pedidos associados a um endereço de e‑mail. Esta rota utiliza
 * a chave de serviço do Supabase para contornar políticas de Row Level
 * Security e permite que o usuário consulte seus próprios pedidos apenas
 * fornecendo o e‑mail. Os resultados são ordenados por data de criação
 * decrescente (mais recentes primeiro).
 */
export async function GET(
  request: Request,
  { params }: { params: { email: string } },
): Promise<ReturnType<typeof NextResponse.json>> {
  const email = decodeURIComponent(params.email).trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'E‑mail inválido' }, { status: 400 });
  }

  const adminSession = await requireAdminRequest(request);
  if (!adminSession) {
    const { user } = await getAuthenticatedUserFromRequest(request);

    if (!user?.email) {
      return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 });
    }

    if (user.email.trim().toLowerCase() !== email) {
      return NextResponse.json({ error: 'Voce so pode consultar os seus proprios pedidos.' }, { status: 403 });
    }
  }

  const supabase = createRequiredServerClient();
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pedidos por e‑mail:', error);
      return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Erro inesperado ao buscar pedidos por e‑mail:', err);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
