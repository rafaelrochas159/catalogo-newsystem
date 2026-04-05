import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/client';
import { getProductPrimaryImage } from '@/lib/product-images';

async function getTopProducts() {
  const db = createServerClient() as any;
  const { data } = await db
    .from('produtos')
    .select('id,nome,slug,imagem_principal,preco_unitario,preco_promocional_unitario')
    .eq('is_active', true)
    .eq('is_destaque', true)
    .limit(6);
  return data || [];
}

export async function TopShowcase() {
  const products = await getTopProducts();
  if (!products.length) return null;

  return (
    <section className="container py-6">
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {products.map((p: any) => (
            <Link key={p.id} href={`/busca?q=${encodeURIComponent(p.nome)}`} className="w-64 rounded-2xl border p-4 bg-card shrink-0">
              <img src={getProductPrimaryImage(p)} alt={p.nome} className="w-full aspect-square object-cover rounded-xl mb-3" />
              <div className="font-medium line-clamp-2 min-h-[48px]">{p.nome}</div>
              <div className="text-neon-blue font-bold mt-2">R$ {(p.preco_promocional_unitario || p.preco_unitario || 0).toFixed(2)}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
