"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Box, Clock, Package, Percent, ShieldCheck, Truck, WalletCards } from 'lucide-react';
import { authorizedFetch, getAnonymousVisitorId, storeExperimentAssignments } from '@/lib/client-auth';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';

const features = [
  { icon: Clock, text: `Desde ${COMPANY_INFO.since} no mercado` },
  { icon: Package, text: `Pedido minimo de R$${BUSINESS_RULES.minOrderValue}` },
  { icon: Percent, text: `${BUSINESS_RULES.discountPercentage}% OFF acima de R$${BUSINESS_RULES.discountThreshold}` },
  { icon: Truck, text: 'Entrega rapida em Sao Paulo' },
];

const trustStats = [
  { label: 'Reposicao agil', value: 'Giro alto e compra rapida' },
  { label: 'Compra segura', value: 'Checkout protegido e Pix validado' },
  { label: 'Atacado flexivel', value: 'Unitario e caixa fechada no mesmo catalogo' },
];

export function HeroSection() {
  const [variantKey, setVariantKey] = useState('control');

  useEffect(() => {
    const assignVariant = async () => {
      try {
        const response = await authorizedFetch('/api/experiments/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: '/',
            anonymousId: getAnonymousVisitorId(),
          }),
        });

        if (!response.ok) return;
        const json = await response.json();
        const assignments = json.assignments || {};

        if (assignments.home_hero_cro) {
          setVariantKey(assignments.home_hero_cro);
          storeExperimentAssignments(assignments);
        }
      } catch {
        // nao bloquear a home
      }
    };

    void assignVariant();
  }, []);

  const copyByVariant: Record<string, {
    badge: string;
    titleTop: string;
    titleBottom: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  }> = {
    control: {
      badge: 'Distribuidora pronta para atacado e reposicao rapida',
      titleTop: 'Compre com margem.',
      titleBottom: 'Receba com agilidade.',
      description: 'Acessorios para celular com giro real, pedido minimo acessivel, oferta clara e atendimento rapido para voce vender melhor.',
      primaryCta: 'Comprar no catalogo',
      secondaryCta: 'Ver caixa fechada',
    },
    oferta: {
      badge: 'Oferta valida para quem precisa repor estoque sem perder margem',
      titleTop: 'Preco forte.',
      titleBottom: 'Reposicao segura.',
      description: 'Mais vendidos, produtos com saida rapida e condicoes para aumentar ticket medio sem complicar o pedido.',
      primaryCta: 'Aproveitar ofertas',
      secondaryCta: 'Comparar unitario e caixa',
    },
    urgencia: {
      badge: 'Estoque com giro real e decisao mais rapida na compra',
      titleTop: 'Entre, escolha',
      titleBottom: 'e compre rapido.',
      description: 'Hero pensado para quem quer decidir sem friccao: beneficios, tipo de compra e atalhos claros logo acima da dobra.',
      primaryCta: 'Ver mais vendidos',
      secondaryCta: 'Levar caixa fechada',
    },
  };

  const copy = copyByVariant[variantKey] || copyByVariant.control;

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-[radial-gradient(circle_at_top_left,rgba(0,243,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_35%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
      <div className="container relative z-10 py-14 sm:py-18 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <Badge variant="outline" className="border-neon-blue/30 bg-neon-blue/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">
                {copy.badge}
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">
                  <span className="bg-gradient-to-r from-white via-neon-blue to-neon-purple bg-clip-text text-transparent">
                    {copy.titleTop}
                  </span>
                  <br />
                  <span className="text-foreground">{copy.titleBottom}</span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {copy.description}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index }}
                  className="rounded-2xl border border-white/8 bg-card/70 p-4 backdrop-blur"
                >
                  <feature.icon className="h-5 w-5 text-neon-blue" />
                  <p className="mt-3 text-sm font-medium leading-6">{feature.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/catalogo/unitario" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-neon-blue px-7 text-black hover:bg-neon-blue/90 sm:w-auto">
                  <Package className="mr-2 h-5 w-5" />
                  {copy.primaryCta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/catalogo/caixa-fechada" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full border-neon-blue/30 bg-background/70 px-7 text-neon-blue hover:bg-neon-blue/10 sm:w-auto">
                  <Box className="mr-2 h-5 w-5" />
                  {copy.secondaryCta}
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">{item.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -top-6 right-8 hidden h-28 w-28 rounded-full bg-neon-blue/20 blur-3xl sm:block" />
            <div className="absolute -bottom-10 left-6 hidden h-28 w-28 rounded-full bg-neon-purple/20 blur-3xl sm:block" />
            <div className="relative overflow-hidden rounded-[32px] border border-neon-blue/20 bg-gradient-to-br from-card via-card to-neon-blue/10 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:p-7">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-background/75 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Compra orientada para conversao</p>
                  <p className="mt-2 text-lg font-bold">Escolha o formato ideal para o seu giro</p>
                </div>
                <div className="rounded-2xl bg-neon-blue/10 p-3 text-neon-blue">
                  <WalletCards className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">Unitario</p>
                  <h3 className="mt-2 text-2xl font-bold">Reposicao rapida</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Ideal para testar giro, recomprar campeoes de venda e montar pedido sem travar caixa.</p>
                </div>
                <div className="rounded-2xl border border-neon-purple/20 bg-neon-purple/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-purple">Caixa fechada</p>
                  <h3 className="mt-2 text-2xl font-bold">Mais margem por unidade</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Visual claro de economia por unidade para aumentar ticket medio sem parecer promocao falsa.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-background/70 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-semibold">Mais confianca na decisao</p>
                    <p className="text-sm text-muted-foreground">Pix, atendimento via WhatsApp e acompanhamento de pedido no mesmo fluxo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-background/70 p-4">
                  <Truck className="mt-0.5 h-5 w-5 text-neon-blue" />
                  <div>
                    <p className="font-semibold">Logistica explicada sem ruído</p>
                    <p className="text-sm text-muted-foreground">Entrega rapida em Sao Paulo e estrutura pronta para recompra com menos friccao.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


