"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package, Box, Truck, Percent, Clock } from 'lucide-react';
import { authorizedFetch, getAnonymousVisitorId, storeExperimentAssignments } from '@/lib/client-auth';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';

const features = [
  { icon: Clock, text: `Desde ${COMPANY_INFO.since} no mercado` },
  { icon: Package, text: `Pedido mínimo R$${BUSINESS_RULES.minOrderValue}` },
  { icon: Percent, text: `${BUSINESS_RULES.discountPercentage}% off acima de R$${BUSINESS_RULES.discountThreshold}` },
  { icon: Truck, text: 'Entrega em SP no mesmo dia' },
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
        // nÃ£o bloquear a home
      }
    };

    assignVariant();
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
      badge: 'Distribuidora de Acessorios para Celular',
      titleTop: 'NEW SYSTEM',
      titleBottom: 'DISTRIBUIDORA',
      description: 'Desde 2016 oferecendo qualidade, preco competitivo e atendimento rapido no mercado de acessorios para celular.',
      primaryCta: 'Catalogo Unitario',
      secondaryCta: 'Caixa Fechada',
    },
    oferta: {
      badge: 'Oferta valida para atacado e reposicao',
      titleTop: 'Compre rapido.',
      titleBottom: 'Reponha melhor.',
      description: 'Produtos com giro alto, envio agil e condicoes para aumentar sua margem desde o primeiro pedido.',
      primaryCta: 'Comprar com oferta',
      secondaryCta: 'Ver caixas fechadas',
    },
    urgencia: {
      badge: 'Estoque com giro real e envio rapido',
      titleTop: 'Reposicao pronta',
      titleBottom: 'para vender.',
      description: 'Mais vendidos, destaques e oportunidades de caixa fechada para acelerar sua decisao e seu ticket medio.',
      primaryCta: 'Ver mais vendidos',
      secondaryCta: 'Levar em caixa',
    },
  };

  const copy = copyByVariant[variantKey] || copyByVariant.control;

  return (
    <section className="relative overflow-hidden min-h-[80vh] flex items-center">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-neon-blue/5" />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 243, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 243, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px]" />

      <div className="container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge 
                variant="outline" 
                className="px-4 py-2 text-sm border-neon-blue/50 text-neon-blue"
              >
                Distribuidora de Acessórios para Celular
              </Badge>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
            >
              <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                NEW SYSTEM
              </span>
              <br />
              <span className="text-foreground">DISTRIBUIDORA</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground max-w-lg"
            >
              Desde 2016 oferecendo qualidade, preço competitivo e atendimento 
              rápido no mercado de acessórios para celular.
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-4"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
                >
                  <feature.icon className="h-5 w-5 text-neon-blue flex-shrink-0" />
                  <span className="text-sm">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap gap-4"
            >
              <div className="w-full rounded-xl border border-neon-blue/20 bg-card/40 px-4 py-3 text-sm">
                <p className="font-semibold text-neon-blue">{copy.badge}</p>
                <p className="mt-1 text-muted-foreground">{copy.description}</p>
              </div>
              <Link href="/catalogo/unitario">
                <Button 
                  size="lg" 
                  className="bg-neon-blue hover:bg-neon-blue/90 text-black font-semibold group"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Catálogo Unitário
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/catalogo/caixa-fechada">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-neon-blue text-neon-blue hover:bg-neon-blue/10 group"
                >
                  <Box className="h-5 w-5 mr-2" />
                  Caixa Fechada
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square">
              {/* Central Circle */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-80 h-80 rounded-full border-2 border-dashed border-neon-blue/30" />
              </motion.div>
              
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-64 h-64 rounded-full border-2 border-dashed border-neon-purple/30" />
              </motion.div>

              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-4xl font-bold text-black">NS</span>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-muted-foreground"
                  >
                    Qualidade Garantida
                  </motion.p>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                className="absolute top-10 right-10 p-4 rounded-xl bg-card border border-border shadow-lg"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Package className="h-8 w-8 text-neon-blue" />
              </motion.div>

              <motion.div
                className="absolute bottom-20 left-10 p-4 rounded-xl bg-card border border-border shadow-lg"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Box className="h-8 w-8 text-neon-purple" />
              </motion.div>

              <motion.div
                className="absolute top-1/2 right-0 p-4 rounded-xl bg-card border border-border shadow-lg"
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity }}
              >
                <Truck className="h-8 w-8 text-green-500" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
