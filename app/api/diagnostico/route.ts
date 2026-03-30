import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/server';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * API de Diagnóstico - Verifica status do sistema
 * GET /api/diagnostico
 */

export async function GET(request: NextRequest) {
  const adminSession = await requireAdminRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'ok' as 'ok' | 'error' | 'warning',
    checks: {
      database: { status: 'unknown', message: '' },
      storage: { status: 'unknown', message: '' },
      environment: { status: 'unknown', message: '' },
    },
    stats: {
      totalProducts: 0,
      totalCategories: 0,
      totalOrders: 0,
      recentErrors: 0,
    },
    recentErrors: [] as any[],
  };

  try {
    const supabase = createRequiredServerClient();

    // Check Database Connection
    try {
      const { count: totalProducts, error: productsError } = await supabase
        .from('produtos')
        .select('id', { count: 'exact', head: true });

      if (productsError) {
        diagnostics.checks.database = { 
          status: 'error', 
          message: `Erro na conexão: ${productsError.message}` 
        };
        diagnostics.status = 'error';
      } else {
        diagnostics.checks.database = { 
          status: 'ok', 
          message: 'Conexão estabelecida' 
        };
        diagnostics.stats.totalProducts = totalProducts || 0;
      }
    } catch (error: any) {
      diagnostics.checks.database = { 
        status: 'error', 
        message: `Erro: ${error.message}` 
      };
      diagnostics.status = 'error';
    }

    // Check Storage
    try {
      const { data: buckets, error: storageError } = await supabase
        .storage
        .listBuckets();

      if (storageError) {
        diagnostics.checks.storage = { 
          status: 'error', 
          message: `Erro no storage: ${storageError.message}` 
        };
      } else {
        const bucketNames = buckets?.map((b: { name: string }) => b.name) || [];
        const imagesBucket = buckets?.find((b: { name: string }) => b.name === 'images');
        
        if (imagesBucket) {
          diagnostics.checks.storage = { 
            status: 'ok', 
            message: `Bucket 'images' encontrado` 
          };
        } else if (bucketNames.length > 0) {
          diagnostics.checks.storage = { 
            status: 'warning', 
            message: `Bucket 'images' não encontrado. Buckets disponíveis: ${bucketNames.join(', ')}` 
          };
        } else {
          diagnostics.checks.storage = { 
            status: 'warning', 
            message: `Nenhum bucket encontrado. Crie um bucket 'images' no painel do Supabase.` 
          };
        }
      }
    } catch (error: any) {
      diagnostics.checks.storage = { 
        status: 'error', 
        message: `Erro: ${error.message}` 
      };
    }

    // Check Environment Variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      diagnostics.checks.environment = { 
        status: 'error', 
        message: `Variáveis ausentes: ${missingVars.join(', ')}` 
      };
      diagnostics.status = 'error';
    } else {
      diagnostics.checks.environment = { 
        status: 'ok', 
        message: 'Todas as variáveis configuradas' 
      };
    }

    // Get Stats
    try {
      const { count: categoriesCount } = await supabase
        .from('categorias')
        .select('*', { count: 'exact', head: true });
      diagnostics.stats.totalCategories = categoriesCount || 0;

      const { count: ordersCount } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true });
      diagnostics.stats.totalOrders = ordersCount || 0;
    } catch (error) {
      // Ignore stats errors
    }

    // Get Recent Errors from Logger
    const logs = logger.getLogs('error');
    diagnostics.stats.recentErrors = logs.length;
    diagnostics.recentErrors = logs.slice(0, 5).map(log => ({
      timestamp: log.timestamp,
      message: log.message,
      route: log.route,
    }));

    // Determine overall status
    const hasErrors = Object.values(diagnostics.checks).some(
      check => check.status === 'error'
    );
    const hasWarnings = Object.values(diagnostics.checks).some(
      check => check.status === 'warning'
    );

    if (hasErrors) {
      diagnostics.status = 'error';
    } else if (hasWarnings) {
      diagnostics.status = 'warning';
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    logger.logError('Erro no diagnóstico', { error: error.message }, 'DiagnosticoAPI');
    
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
