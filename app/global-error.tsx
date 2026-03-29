'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Registra o erro crítico no logger
    logger.logError('ERRO GLOBAL DA APLICAÇÃO', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      isGlobal: true,
    }, 'GlobalError');
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
          <div className="text-center max-w-lg">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold mb-4">Erro Crítico</h1>
            <p className="text-muted-foreground mb-8">
              Ocorreu um erro grave na aplicação. Por favor, recarregue a página ou tente novamente mais tarde.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="bg-muted p-4 rounded-lg mb-8 text-left">
                <p className="text-sm font-mono text-red-500 mb-2">{error.message}</p>
                {error.stack && (
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={reset}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Recarregar aplicação
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
