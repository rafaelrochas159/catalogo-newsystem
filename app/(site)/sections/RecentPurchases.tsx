import { createServerClient } from '@/lib/supabase/client';
import { Clock } from 'lucide-react';

/**
 * RecentPurchasesSection
 *
 * This server component queries the Supabase database for the most recent
 * approved purchases and displays them as a list. It provides social proof
 * without exposing personal data and helps build trust by showing that
 * other customers are actively buying. When there are no recent purchases,
 * a neutral message is shown. The section is fully responsive.
 */
export async function RecentPurchasesSection() {
  const supabase = createServerClient();
  // Fetch the last 5 approved orders (status_pagamento == 'approved' or
  // status_pedido == 'pago'). Adjust the filters as needed based on your
  // business logic.
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, created_at, endereco')
    .in('status_pagamento', ['approved', 'pago'])
    .order('created_at', { ascending: false })
    .limit(5);

  // Helper to format time ago in a human friendly way. Returns strings
  // like "5 minutos", "2 horas", "3 dias".
  function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hora${diffHours === 1 ? '' : 's'}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} dia${diffDays === 1 ? '' : 's'}`;
  }

  return (
    <section className="py-10 border-t border-border bg-background/60">
      <div className="container">
        <h2 className="text-2xl font-bold mb-6">Compras recentes</h2>
        {pedidos && pedidos.length > 0 ? (
          <ul className="space-y-4">
            {pedidos.map((pedido) => {
              // Extract city and state from the address JSON if available.
              let city: string | undefined;
              let state: string | undefined;
              try {
                const endereco: any = pedido.endereco;
                city = endereco?.cidade;
                state = endereco?.estado;
              } catch (e) {
                // ignore JSON parsing errors
              }
              const time = timeAgo(pedido.created_at as any);
              const message = city && state
                ? `Cliente de ${city} - ${state} realizou uma compra`
                : 'Compra confirmada';
              return (
                <li key={pedido.id} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
                  <Clock className="h-5 w-5 text-neon-blue flex-shrink-0" />
                  <span className="text-sm md:text-base text-foreground/90">
                    {message} há {time}.
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma compra recente disponível no momento.</p>
        )}
      </div>
    </section>
  );
}