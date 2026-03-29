"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Categoria } from '@/types';
import { 
  Speaker, 
  Radio, 
  Headphones, 
  Wrench, 
  Mic, 
  Smartphone,
  Battery,
  Cable,
  Droplets,
  Database,
  Fan,
  Lightbulb,
  Scissors,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal,
  Sparkles
} from 'lucide-react';

interface CategoriesSectionProps {
  categories: Categoria[];
}

const iconMap: Record<string, React.ElementType> = {
  'novo': Sparkles,
  'caixa-de-som': Speaker,
  'radio': Radio,
  'fone-de-ouvido': Headphones,
  'kit-de-ferramentas': Wrench,
  'microfone': Mic,
  'suporte': Smartphone,
  'carregador': Battery,
  'cabo-de-celular': Cable,
  'umidificador': Droplets,
  'memoria-e-pendrive': Database,
  'fan': Fan,
  'iluminacao': Lightbulb,
  'cortador-de-cabelo': Scissors,
  'controle-remoto': Gamepad2,
  'mercearias': ShoppingBag,
  'outros': MoreHorizontal,
};

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  return (
    <section className="py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Categorias</h2>
          <p className="text-muted-foreground">
            Explore nossas categorias e encontre os melhores produtos
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const Icon = iconMap[category.slug] || MoreHorizontal;
            
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/categoria/${category.slug}`}>
                  <div className="group p-4 rounded-xl bg-card border border-border hover:border-neon-blue/50 transition-all duration-300 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-neon-blue/10 transition-colors">
                      <Icon className="h-6 w-6 text-muted-foreground group-hover:text-neon-blue transition-colors" />
                    </div>
                    <h3 className="text-sm font-medium line-clamp-2">{category.nome}</h3>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CategoriesSection;
