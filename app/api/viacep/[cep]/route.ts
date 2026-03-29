import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { cep: string } }) {
  const cep = (params.cep || '').replace(/\D/g, '');
  if (cep.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
  }

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || data?.erro) {
    return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
