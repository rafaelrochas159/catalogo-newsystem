'use client';

import { useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { authorizedFetch } from '@/lib/client-auth';

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
const MIN_PING_GAP_MS = 60 * 1000;

export function PresenceHeartbeat() {
  const lastPingAtRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const pingActivity = async (force = false) => {
      if (!mounted || typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      if (!force && now - lastPingAtRef.current < MIN_PING_GAP_MS) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      lastPingAtRef.current = now;

      try {
        await authorizedFetch('/api/account/activity', {
          method: 'POST',
          cache: 'no-store',
        });
      } catch {
        // presenca nao deve quebrar navegacao
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void pingActivity(true);
      }
    };

    const handleFocus = () => {
      void pingActivity(true);
    };

    void pingActivity(true);
    const interval = window.setInterval(() => {
      void pingActivity(false);
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session?.access_token && event !== 'SIGNED_OUT') {
        void pingActivity(true);
      }
    });

    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
