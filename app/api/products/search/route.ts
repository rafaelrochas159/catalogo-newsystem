import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ data: [] });

  const db = createServerClient() as any;
  const { data, error } = await db
    .from('produtos')
    .select('id,nome,sku,slug,imagem_principal,tipo_catalogo,preco_unitario,preco_caixa,preco_promocional_unitario,preco_promocional_caixa')
    .or(`nome.ilike.%${q}%,sku.ilike.%${q}%`)
    .eq('is_active', true)
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}
