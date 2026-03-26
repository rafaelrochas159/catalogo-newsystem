import { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  
  // Base URL
  const baseUrl = 'https://newsystem.com.br';

  // Static routes
  const staticRoutes = [
    '',
    '/catalogo/unitario',
    '/catalogo/caixa-fechada',
    '/contato',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic routes - Products
  const { data: products } = await supabase
    .from('produtos')
    .select('slug, updated_at')
    .eq('is_active', true);

  const productRoutes = (products || []).map((product: { slug: string; updated_at?: string }) => ({
    url: `${baseUrl}/produto/${product.slug}`,
    lastModified: new Date(product.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Dynamic routes - Categories
  const { data: categories } = await supabase
    .from('categorias')
    .select('slug')
    .eq('is_active', true);

  const categoryRoutes = (categories || []).map((category: { slug: string }) => ({
    url: `${baseUrl}/categoria/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}