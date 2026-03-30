'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCcw, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountTabsEnhanced } from './AccountTabsEnhanced';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';

export function MinhaContaClientPage() {
  const router = useRouter();
  const [account, setAccount] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAccount();
  }, [router]);

  const loadAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/account', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await readJsonSafely<{ data?: any; error?: string }>(response);
      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        throw new Error(getResponseErrorMessage(response, json, 'Erro ao carregar sua conta.'));
      }

      if (!json?.data) {
        throw new Error('Nao foi possivel interpretar os dados da sua conta.');
      }

      setAccount(json.data);
    } catch (loadError: any) {
      setError(loadError?.message || 'Erro ao carregar sua conta.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="rounded-[28px] border border-neon-blue/20 bg-gradient-to-br from-card via-card to-neon-blue/5 p-6 shadow-[0_30px_100px_rgba(0,243,255,0.08)]">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
              <div className="h-10 w-72 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Minha conta</h1>
        <div className="rounded-lg border p-4 text-sm text-red-500">
          {error || 'NÃ£o foi possÃ­vel carregar sua conta.'}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Minha conta</h1>
      <AccountTabsEnhanced initialData={account} />
    </div>
  );
}
