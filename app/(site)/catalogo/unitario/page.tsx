import { Metadata } from 'next';
import { CatalogPage } from '../components/CatalogPage';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Catálogo Unitário | NEW SYSTEM DISTRIBUIDORA',
  description: 'Catálogo de produtos unitários da NEW SYSTEM DISTRIBUIDORA. Acessórios para celular com qualidade e preço competitivo. Pedido mínimo R$200.',
  alternates: {
    canonical: '/catalogo/unitario',
  },
};

async function getProducts() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('tipo_catalogo', 'UNITARIO')
    .eq('is_active', true)
    .order('nome');
  
  return data || [];
}

async function getCategories() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('is_active', true)
    .order('order_index');
  
  return data || [];
}

export default async function UnitarioPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <CatalogPage
      title="Catálogo Unitário"
      description="Produtos unitários com pedido mínimo de R$200. 10% de desconto em compras acima de R$1000."
      products={products}
      categories={categories}
      catalogType="UNITARIO"
    />
  );
}
