import Link from 'next/link';
import { createRequiredServerClient } from '@/lib/supabase/client';

export default async function AdminClientesPage() {
  const db = createRequiredServerClient() as any;
  const { data } = await db
    .from('customer_profiles')
    .select('*, customer_addresses(*), pedidos(total,id)')
    .order('created_at', { ascending: false });

  const rows = (data || []).map((item: any) => ({
    ...item,
    total_gasto: (item.pedidos || []).reduce((acc: number, p: any) => acc + Number(p.total || 0), 0),
    qtd_pedidos: (item.pedidos || []).length,
  }));

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Clientes</h1>
      <div className="space-y-4">
        {rows.map((c: any) => (
          <div key={c.id} className="rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold">{c.nome || 'Sem nome'}</div>
              <div className="text-sm text-muted-foreground">{c.email || 'Sem e-mail'} • {c.telefone || 'Sem telefone'}</div>
              <div className="text-sm text-muted-foreground">Pedidos: {c.qtd_pedidos} • Total gasto: R$ {c.total_gasto.toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">{c.status}</span>
              <Link href={`/admin/clientes/${c.id}`} className="underline">Abrir</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
