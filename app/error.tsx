'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Registra o erro no logger
    logger.logError('Erro capturado pelo Error Boundary', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    }, 'ErrorBoundary');
  }, [error]);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
        <p className="text-muted-foreground mb-6">
          Ocorreu um erro ao carregar esta página. Tente novamente ou entre em contato com o suporte.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-muted p-4 rounded-lg mb-6 text-left">
            <p className="text-sm font-mono text-red-500 mb-2">{error.message}</p>
            {error.stack && (
              <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
                {error.stack}
              </pre>
            )}
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}
