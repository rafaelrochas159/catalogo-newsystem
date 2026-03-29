import { NextResponse } from 'next/server';
import { createRequiredServerClient } from '@/lib/supabase/client';

/**
 * POST /api/admin/change-password
 *
 * Este endpoint permite ao administrador alterar a senha de um usuário (cliente)
 * autenticado no Supabase. É necessário enviar um JSON no body contendo
 * `userId` (string) e `password` (string). O endpoint utiliza a chave de
 * serviço do Supabase (SUPABASE_SERVICE_ROLE_KEY) por meio da função
 * createRequiredServerClient, portanto, assegure-se de que essa variável
 * esteja configurada. Para segurança, nenhum detalhe sensível é retornado
 * ao cliente; em caso de erro, apenas uma mensagem genérica é enviada.
 */
export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();
    if (!userId || typeof userId !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }
    const supabase = createRequiredServerClient();
    // Atualiza a senha do usuário via auth.admin. O método updateUserById
    // permite alterar atributos de usuário administrativamente. Ele retorna
    // um objeto com a propriedade error quando há falha. Nenhuma informação
    // sensível é exposta ao cliente.
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) {
      console.error('Erro ao alterar senha do cliente', error);
      return NextResponse.json({ error: 'Não foi possível alterar a senha' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro inesperado em change-password', err);
    return NextResponse.json({ error: 'Erro interno ao alterar senha' }, { status: 500 });
  }
}