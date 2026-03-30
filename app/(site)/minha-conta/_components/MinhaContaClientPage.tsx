'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AccountTabsEnhanced } from './AccountTabsEnhanced';

export function MinhaContaClientPage() {
  const router = useRouter();
  const [account, setAccount] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccount();
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

      const json = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        throw new Error(json.error || 'Erro ao carregar sua conta.');
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
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue" />
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
