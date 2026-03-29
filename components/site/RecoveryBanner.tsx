"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * RecoveryBanner
 *
 * This client-side component displays a call-to-action for returning customers. If
 * an email was previously stored in localStorage (via the checkout flow), the
 * banner invites the user to revisit their order history. This helps with
 * customer recovery and improves the post-purchase experience. If no stored
 * email is found, nothing is rendered.
 */
export function RecoveryBanner() {
  const [hasEmail, setHasEmail] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ns_last_email');
      if (stored) {
        setHasEmail(true);
      }
    } catch (e) {
      // ignore storage errors (e.g., private mode)
    }
  }, []);

  if (!hasEmail) return null;

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