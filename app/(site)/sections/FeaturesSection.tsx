"use client";

import { motion } from 'framer-motion';
import { 
  Truck, 
  Shield, 
  Headphones, 
  Zap, 
  PackageCheck, 
  Clock 
} from 'lucide-react';

const features = [
  {
    icon: Truck,
    title: 'Entrega Rápida',
    description: 'Entrega em São Paulo no mesmo dia conforme disponibilidade. Envio para todo Brasil.',
    color: 'text-blue-500',
  },
  {
    icon: Shield,
    title: 'Qualidade Garantida',
    description: 'Produtos selecionados com rigoroso controle de qualidade.',
    color: 'text-green-500',
  },
  {
    icon: Headphones,
    title: 'Atendimento',
    description: 'Suporte dedicado via WhatsApp para tirar todas as suas dúvidas.',
    color: 'text-purple-500',
  },
  {
    icon: Zap,
    title: 'Preço Competitivo',
    description: 'Os melhores preços do mercado com descontos especiais.',
    color: 'text-yellow-500',
  },
  {
    icon: PackageCheck,
    title: 'Pedido Mínimo',
    description: 'Pedido mínimo de apenas R$200 para produtos unitários.',
    color: 'text-neon-blue',
  },
  {
    icon: Clock,
    title: 'Desde 2016',
    description: 'Mais de 8 anos de experiência no mercado de acessórios.',
    color: 'text-pink-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16 border-y border-border/40">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">
            Por que escolher a{' '}
            <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              NEW SYSTEM
            </span>
            ?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Oferecemos o melhor em acessórios para celular com qualidade, 
            preço justo e atendimento diferenciado.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group p-6 rounded-xl bg-card border border-border hover:border-neon-blue/50 transition-all duration-300"
            >
              <div className={`
                w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4
                group-hover:scale-110 transition-transform duration-300
              `}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}