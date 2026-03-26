"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Produto } from '@/types';

interface BestSellersProps {
  products: Produto[];
}

export function BestSellers({ products }: BestSellersProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Mais Vendidos</h2>
              <p className="text-muted-foreground">
                Produtos que os clientes mais compram
              </p>
            </div>
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