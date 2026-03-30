"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * RecoveryBanner
 *
 * This client-side component displays a call-to-action for returning customers.
 * It no longer depends on an e-mail stored locally. Instead, it uses the last
 * known order number to decide whether the user likely has recent purchase
 * history and should see a shortcut back to the authenticated area.
 */
export function RecoveryBanner() {
  const [hasRecentOrder, setHasRecentOrder] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ns_last_order_number');
      if (stored) {
        setHasRecentOrder(true);
      }
    } catch (e) {
      // ignore storage errors (e.g., private mode)
    }
  }, []);

  if (!hasRecentOrder) return null;

  return (
    <div className="container py-6 flex flex-col items-center gap-3 bg-neon-blue/5 border-t border-border">
      <p className="text-sm md:text-base text-center max-w-md">
        Você já comprou conosco! Consulte seus pedidos ou continue de onde parou.
      </p>
      <Link href="/meus-pedidos">
        <Button
          size="lg"
          className="bg-neon-blue text-black hover:bg-neon-blue/90 font-semibold"
        >
          Ver meus pedidos
        </Button>
      </Link>
    </div>
  );
}
