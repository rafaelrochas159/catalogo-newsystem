'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCcw, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountTabsEnhanced } from './AccountTabsEnhanced';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';

export function MinhaContaClientExperience() {
  const router = useRouter();
  const [account, setAccount] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (process.env.NODE_ENV !== 'production') {
        console.info('[minha-conta] load response', { status: response.status, ok: response.ok });
      }

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

  useEffect(() => {
    void loadAccount();
  }, [router]);

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
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-500/20 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-500/10 p-3 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
                  Falha ao carregar
                </p>
                <h1 className="mt-1 text-3xl font-bold">Minha conta</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {error || 'Nao foi possivel carregar sua conta.'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadAccount()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const orderCount = account.orders?.length || 0;
  const favoriteCount = account.favorites?.length || 0;
  const addressCount = account.addresses?.length || 0;

  return (
    <div className="container py-8">
      <section className="overflow-hidden rounded-[32px] border border-neon-blue/15 bg-gradient-to-br from-card via-card to-neon-blue/5 shadow-[0_30px_100px_rgba(0,243,255,0.08)]">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-neon-blue/20 bg-neon-blue/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">
              <Sparkles className="h-3.5 w-3.5" />
              Area segura do cliente
            </div>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Ola, {account.profile?.nome || 'cliente'}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Aqui voce acompanha pedidos, atualiza seus dados, salva favoritos e mantem seu historico organizado sem depender de atendimento manual.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                Sessao autenticada
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2">
                <UserRound className="h-4 w-4 text-neon-blue" />
                {account.profile?.email || 'Email nao informado'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Card className="border-neon-blue/15 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pedidos</p>
                <p className="mt-2 text-3xl font-bold">{orderCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Historico sempre acessivel</p>
              </CardContent>
            </Card>
            <Card className="border-neon-blue/15 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Favoritos</p>
                <p className="mt-2 text-3xl font-bold">{favoriteCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Produtos salvos para recompra</p>
              </CardContent>
            </Card>
            <Card className="border-neon-blue/15 bg-background/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Enderecos</p>
                <p className="mt-2 text-3xl font-bold">{addressCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Dados prontos para checkout rapido</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <AccountTabsEnhanced initialData={account} onDataChange={setAccount} />
      </div>
    </div>
  );
}
