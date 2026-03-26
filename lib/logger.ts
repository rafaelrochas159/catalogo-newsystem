/**
 * Sistema de Log de Erros - NEW SYSTEM Distribuidora
 * Registra automaticamente erros, warnings e informações
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  route?: string;
  component?: string;
  stack?: string;
  details?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private storageKey = 'new-system-logs';

  private constructor() {
    this.loadLogs();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configura handlers globais de erro
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Captura erros de JavaScript
      window.onerror = (message, source, lineno, colno, error) => {
        this.logError('Erro JavaScript não tratado', {
          message: String(message),
          source,
          lineno,
          colno,
          stack: error?.stack,
        });
        return false;
      };

      // Captura rejeições de promises não tratadas
      window.addEventListener('unhandledrejection', (event) => {
        this.logError('Promise rejeitada não tratada', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });

      // Captura erros de recursos (imagens, scripts, etc)
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          this.logError('Erro ao carregar recurso', {
            tagName: (event.target as HTMLElement).tagName,
            src: (event.target as HTMLImageElement | HTMLScriptElement).src,
          });
        }
      }, true);
    }
  }

  /**
   * Gera ID único para o log
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém informações do ambiente
   */
  private getEnvironmentInfo(): Partial<LogEntry> {
    if (typeof window === 'undefined') {
      return { route: 'server' };
    }
    return {
      route: window.location.pathname,
      userAgent: window.navigator.userAgent,
      url: window.location.href,
    };
  }

  /**
   * Salva logs no localStorage
   */
  private saveLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
      } catch (e) {
        console.error('Erro ao salvar logs:', e);
      }
    }
  }

  /**
   * Carrega logs do localStorage
   */
  private loadLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Erro ao carregar logs:', e);
        this.logs = [];
      }
    }
  }

  /**
   * Adiciona um log
   */
  private addLog(level: LogLevel, message: string, details?: Record<string, any>, component?: string): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      details,
      ...this.getEnvironmentInfo(),
    };

    // Adiciona stack trace para erros
    if (level === 'error' && details?.stack) {
      entry.stack = details.stack;
    }

    // Mantém apenas os logs mais recentes
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.saveLogs();

    // Também loga no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[${level.toUpperCase()}]`, message, details);
    }

    return entry;
  }

  /**
   * Log de informação
   */
  logInfo(message: string, details?: Record<string, any>, component?: string): LogEntry {
    return this.addLog('info', message, details, component);
  }

  /**
   * Log de aviso
   */
  logWarn(message: string, details?: Record<string, any>, component?: string): LogEntry {
    return this.addLog('warn', message, details, component);
  }

  /**
   * Log de erro
   */
  logError(message: string, details?: Record<string, any>, component?: string): LogEntry {
    return this.addLog('error', message, details, component);
  }

  /**
   * Log de erro do Supabase
   */
  logSupabaseError(operation: string, table: string, error: any): LogEntry {
    return this.logError(`Erro Supabase: ${operation} em ${table}`, {
      operation,
      table,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
    }, 'Supabase');
  }

  /**
   * Log de erro de API
   */
  logApiError(endpoint: string, method: string, error: any, requestData?: any): LogEntry {
    return this.logError(`Erro API: ${method} ${endpoint}`, {
      endpoint,
      method,
      requestData,
      errorMessage: error?.message,
      statusCode: error?.status,
    }, 'API');
  }

  /**
   * Obtém todos os logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Obtém logs paginados
   */
  getLogsPaginated(page: number = 1, limit: number = 50, level?: LogLevel): { logs: LogEntry[]; total: number } {
    const filtered = level ? this.logs.filter(log => log.level === level) : this.logs;
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      logs: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  /**
   * Limpa todos os logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }

  /**
   * Exporta logs para JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Obtém estatísticas de logs
   */
  getStats(): { total: number; info: number; warn: number; error: number } {
    return {
      total: this.logs.length,
      info: this.logs.filter(l => l.level === 'info').length,
      warn: this.logs.filter(l => l.level === 'warn').length,
      error: this.logs.filter(l => l.level === 'error').length,
    };
  }
}

// Exporta instância singleton
export const logger = Logger.getInstance();

// Exporta funções individuais para conveniência
export const logInfo = (message: string, details?: Record<string, any>, component?: string) => 
  logger.logInfo(message, details, component);

export const logWarn = (message: string, details?: Record<string, any>, component?: string) => 
  logger.logWarn(message, details, component);

export const logError = (message: string, details?: Record<string, any>, component?: string) => 
  logger.logError(message, details, component);

export const logSupabaseError = (operation: string, table: string, error: any) => 
  logger.logSupabaseError(operation, table, error);

export const logApiError = (endpoint: string, method: string, error: any, requestData?: any) => 
  logger.logApiError(endpoint, method, error, requestData);

export default logger;
