"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Produto } from '@/types';

interface FeaturedProductsProps {
  products: Produto[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h2 className="text-3xl font-bold mb-2">Destaques</h2>
            <p className="text-muted-foreground">
              Selecionados no painel para puxar conversao logo no topo
            </p>
          </div>
          <Link href="/catalogo/unitario">
            <Button variant="outline" className="group">
              Ver Todos
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        <ProductGrid 
          products={products} 
          catalogType="UNITARIO"
        />
      </div>
    </section>
  );
}
