import { NextRequest, NextResponse } from 'next/server';
import { logger, LogLevel } from '@/lib/logger';

/**
 * API para consultar logs do sistema
 * GET /api/logs - Retorna todos os logs
 * GET /api/logs?level=error - Retorna apenas logs de erro
 * GET /api/logs?page=1&limit=50 - Paginação
 * DELETE /api/logs - Limpa todos os logs
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro
    const level = searchParams.get('level') as LogLevel | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    // Validação de parâmetros
    const validLevels: LogLevel[] = ['info', 'warn', 'error'];
    if (level && !validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Nível de log inválido. Use: info, warn ou error' },
        { status: 400 }
      );
    }
    
    // Obtém logs paginados
    const result = logger.getLogsPaginated(page, limit, level || undefined);
    
    // Obtém estatísticas
    const stats = logger.getStats();
    
    return NextResponse.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    logger.clearLogs();
    
    return NextResponse.json({
      success: true,
      message: 'Logs limpos com sucesso',
    });
  } catch (error) {
    console.error('Erro ao limpar logs:', error);
    return NextResponse.json(
      { error: 'Erro interno ao limpar logs' },
      { status: 500 }
    );
  }
}

// Permitir CORS para desenvolvimento
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
