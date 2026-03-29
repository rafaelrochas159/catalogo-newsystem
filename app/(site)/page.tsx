import { Metadata } from 'next';
import { HeroSection } from './sections/HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { FeaturedProducts } from './sections/FeaturedProducts';
import { BestSellers } from './sections/BestSellers';
import { NewArrivals } from './sections/NewArrivals';
import { CategoriesSection } from './sections/CategoriesSection';
import { PromotionsSection } from './sections/PromotionsSection';
import { RecentPurchasesSection } from './sections/RecentPurchases';
import { TrustSection } from './sections/TrustSection';
import { createServerClient } from '@/lib/supabase/client';
import { RecoveryBanner } from '@/components/site/RecoveryBanner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'NEW SYSTEM DISTRIBUIDORA | Acessórios para Celular',
  description: 'Desde 2016 no mercado de acessórios para celular. Qualidade, preço competitivo e atendimento rápido. Pedido mínimo R$200. Entrega em São Paulo no mesmo dia.',
  alternates: {
    canonical: '/',
  },
};

async function getFeaturedProducts() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('is_active', true)
    .eq('is_destaque', true)
    .limit(8);
  
  return data || [];
}

async function getBestSellers() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('is_active', true)
    .eq('is_mais_vendido', true)
    .limit(8);
  
  return data || [];
}

async function getNewArrivals() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('is_active', true)
    .eq('is_novo', true)
    .order('created_at', { ascending: false })
    .limit(8);
  
  return data || [];
}

async function getPromotions() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*)
    `)
    .eq('is_active', true)
    .eq('is_promocao', true)
    .limit(8);
  
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

export default async function HomePage() {
  const [featuredProducts, bestSellers, newArrivals, promotions, categories] = await Promise.all([
    getFeaturedProducts(),
    getBestSellers(),
    getNewArrivals(),
    getPromotions(),
    getCategories(),
  ]);

  return (
    <>
      <HeroSection />
      {/* Customer orders CTA: link to the area where users can track their orders. */}
      <div className="container py-8 flex justify-center">
        <Link href="/meus-pedidos">
          <Button
            size="lg"
            className="bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue text-neon-blue font-semibold"
          >
            📦 Acompanhar meus pedidos
          </Button>
        </Link>
      </div>
      {/* Recovery banner shown only to returning customers with stored email */}
      <RecoveryBanner />
      <FeaturesSection />
      {/* Display recent purchases to build social proof */}
      <RecentPurchasesSection />
      <CategoriesSection categories={categories} />
      <FeaturedProducts products={featuredProducts} />
      <PromotionsSection products={promotions} />
      <BestSellers products={bestSellers} />
      <NewArrivals products={newArrivals} />
      {/* Trust and benefits section at the bottom of the home page */}
      <TrustSection />
    </>
  );
}
