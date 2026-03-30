import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryPage } from './CategoryPage';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

async function getCategory(slug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  return data;
}

async function getProducts(categoryId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('categoria_id', categoryId)
    .eq('is_active', true)
    .order('nome');
  
  return data || [];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await getCategory(params.slug);
  
  if (!category) {
    return {
      title: 'Categoria não encontrada | NEW SYSTEM DISTRIBUIDORA',
    };
  }

  return {
    title: `${category.nome} | NEW SYSTEM DISTRIBUIDORA`,
    description: category.descricao || `Confira nossa seleção de ${category.nome} na NEW SYSTEM DISTRIBUIDORA.`,
  };
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const category = await getCategory(params.slug);
  
  if (!category) {
    notFound();
  }

  const products = await getProducts(category.id);

  return (
    <CategoryPage 
      category={category}
      products={products}
    />
  );
}
