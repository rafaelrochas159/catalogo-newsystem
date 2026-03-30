import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'A consulta de pedidos por e-mail foi desativada. Acesse seus pedidos com sessao autenticada.',
    },
    { status: 410 }
  );
}
