import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductPage } from './ProductPage';
import { createServerClient } from '@/lib/supabase/client';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

async function getProduct(slug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  return data;
}

async function getRelatedProducts(categoriaId: string, currentProductId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('categoria_id', categoriaId)
    .eq('is_active', true)
    .neq('id', currentProductId)
    .limit(4);
  
  return data || [];
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct(params.slug);
  
  if (!product) {
    return {
      title: 'Produto não encontrado | NEW SYSTEM DISTRIBUIDORA',
    };
  }

  return {
    title: `${product.nome} | NEW SYSTEM DISTRIBUIDORA`,
    description: product.meta_description || product.descricao || `Compre ${product.nome} na NEW SYSTEM DISTRIBUIDORA. Melhor preço e qualidade garantida.`,
    openGraph: {
      title: product.meta_title || product.nome,
      description: product.meta_description || product.descricao,
      images: [product.imagem_principal],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProduct(params.slug);
  
  if (!product) {
    notFound();
  }

  // Garantir que o produto tenha valores padrão para preços
  const productWithDefaults = {
    ...product,
    preco_unitario: product.preco_unitario || 0,
    preco_caixa: product.preco_caixa || 0,
    preco_promocional_unitario: product.preco_promocional_unitario || null,
    preco_promocional_caixa: product.preco_promocional_caixa || null,
    estoque_unitario: product.estoque_unitario || 0,
    estoque_caixa: product.estoque_caixa || 0,
  };

  // Increment view count
  const supabaseClient = createServerClient();
  await supabaseClient
    .from('produtos')
    .update({ visualizacoes: (product.visualizacoes || 0) + 1 })
    .eq('id', product.id);

  const relatedProducts = product.categoria_id 
    ? await getRelatedProducts(product.categoria_id, product.id)
    : [];

  return (
    <ProductPage 
      product={productWithDefaults} 
      relatedProducts={relatedProducts}
    />
  );
}
