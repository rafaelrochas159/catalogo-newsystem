import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth/server';
import { createRequiredServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminClienteDetalhePage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const db = createRequiredServerClient() as any;
  const { data } = await db.from('customer_profiles').select('*, customer_addresses(*), pedidos(*)').eq('user_id', params.id).maybeSingle();
  if (!data) return notFound();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold">{data.nome || 'Cliente'}</h1>
      <div className="rounded-xl border p-4 space-y-2">
        <div>E-mail: {data.email || '—'}</div>
        <div>Telefone: {data.telefone || '—'}</div>
        <div>Status: {data.status}</div>
        <div>Observações: {data.observacoes_internas || '—'}</div>
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-3">Endereço principal</h2>
        {data.customer_addresses?.[0] ? <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(data.customer_addresses[0], null, 2)}</pre> : 'Sem endereço'}
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="font-semibold mb-3">Pedidos</h2>
        <div className="space-y-2">
          {(data.pedidos || []).map((p: any) => <div key={p.id} className="text-sm">{p.numero_pedido} • R$ {Number(p.total || 0).toFixed(2)} • {p.status_pagamento || p.status_pedido}</div>)}
        </div>
      </div>
    </div>
  );
}
