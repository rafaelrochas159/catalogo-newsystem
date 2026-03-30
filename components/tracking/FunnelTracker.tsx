"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getAnonymousVisitorId, trackClientEvent } from '@/lib/client-auth';

export function FunnelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams?.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;
    if (!currentPath || lastTrackedRef.current === currentPath) return;

    lastTrackedRef.current = currentPath;

    void trackClientEvent({
      eventName: 'visit',
      page: currentPath,
      metadata: {
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        anonymousId: getAnonymousVisitorId(),
      },
    });
  }, [pathname, searchParams]);

  return null;
}
