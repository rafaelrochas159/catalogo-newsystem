import { Metadata } from 'next';
import { CatalogPage } from '../components/CatalogPage';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Catálogo Caixa Fechada | NEW SYSTEM DISTRIBUIDORA',
  description: 'Catálogo de produtos em caixa fechada da NEW SYSTEM DISTRIBUIDORA. Acessórios para celular com preços especiais para revenda.',
  alternates: {
    canonical: '/catalogo/caixa-fechada',
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
    .eq('tipo_catalogo', 'CAIXA_FECHADA')
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

export default async function CaixaFechadaPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <CatalogPage
      title="Catálogo Caixa Fechada"
      description="Produtos em caixa fechada com preços especiais para revenda."
      products={products}
      categories={categories}
      catalogType="CAIXA_FECHADA"
    />
  );
}
