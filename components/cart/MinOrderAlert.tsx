"use client";

import { motion } from 'framer-motion';
import { AlertTriangle, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { BUSINESS_RULES } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';

export function MinOrderAlert() {
  const catalogType = useCart((state) => state.catalogType);
  const getSubtotal = useCart((state) => state.getSubtotal);
  const hasMinOrder = useCart((state) => state.hasMinOrder);
  const getRemainingForMinOrder = useCart((state) => state.getRemainingForMinOrder);

  // Só mostrar para catálogo unitário
  if (catalogType !== 'UNITARIO') return null;

  const subtotal = getSubtotal();
  const hasMin = hasMinOrder();
  const remaining = getRemainingForMinOrder();
  const progress = Math.min((subtotal / BUSINESS_RULES.minOrderValue) * 100, 100);

  if (hasMin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-green-500">Pedido mínimo atingido!</p>
            <p className="text-sm text-muted-foreground">
              Você atingiu o pedido mínimo de {formatPrice(BUSINESS_RULES.minOrderValue)}.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={100} className="h-2 bg-green-500/20" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-yellow-500">Pedido mínimo não atingido</p>
          <p className="text-sm text-muted-foreground">
            Faltam <span className="font-bold text-yellow-500">{formatPrice(remaining)}</span> para atingir o pedido mínimo de {formatPrice(BUSINESS_RULES.minOrderValue)}.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatPrice(subtotal)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatPrice(BUSINESS_RULES.minOrderValue)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}