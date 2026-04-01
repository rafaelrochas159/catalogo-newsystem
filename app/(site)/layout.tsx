import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { FunnelTracker } from '@/components/tracking/FunnelTracker';
import { PresenceHeartbeat } from '@/components/tracking/PresenceHeartbeat';
import { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <FunnelTracker />
      </Suspense>
      <Suspense fallback={null}>
        <PresenceHeartbeat />
      </Suspense>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
          },
          success: {
            iconTheme: {
              primary: '#00f3ff',
              secondary: '#000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#000',
            },
          },
        }}
      />
    </div>
  );
}
