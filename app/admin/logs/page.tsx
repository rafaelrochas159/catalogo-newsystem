'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logger, LogEntry, LogLevel } from '@/lib/logger';
import toast from 'react-hot-toast';

interface LogStats {
  total: number;
  info: number;
  warn: number;
  error: number;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: LogStats;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({ total: 0, info: 0, warn: 0, error: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (level !== 'all') params.append('level', level);

      const response = await fetch(`/api/logs?${params}`);
      const data: LogsResponse = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Erro ao carregar logs');
      }
    } catch (error) {
      toast.error('Erro ao carregar logs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, level]);

  const handleClearLogs = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os logs?')) return;

    try {
      const response = await fetch('/api/logs', { method: 'DELETE' });
      if (response.ok) {
        toast.success('Logs limpos com sucesso');
        fetchLogs();
      } else {
        toast.error('Erro ao limpar logs');
      }
    } catch (error) {
      toast.error('Erro ao limpar logs');
    }
  };

  const handleExportLogs = () => {
    const json = logger.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Logs exportados com sucesso');
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warn':
        return <Badge className="bg-yellow-500">Aviso</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Logs do Sistema</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie os logs de erros e eventos do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="destructive" onClick={handleClearLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total de Logs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-500">{stats.info}</div>
              <div className="text-sm text-muted-foreground">Info</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-500">{stats.warn}</div>
              <div className="text-sm text-muted-foreground">Avisos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-500">{stats.error}</div>
              <div className="text-sm text-muted-foreground">Erros</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={level} onValueChange={(v) => { setLevel(v as LogLevel | 'all'); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="error">Erros</SelectItem>
              <SelectItem value="warn">Avisos</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Itens por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Nível</th>
                      <th className="text-left p-4">Data/Hora</th>
                      <th className="text-left p-4">Mensagem</th>
                      <th className="text-left p-4">Rota</th>
                      <th className="text-left p-4">Componente</th>
                      <th className="text-right p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getLevelIcon(log.level)}
                            {getLevelBadge(log.level)}
                          </div>
                        </td>
                        <td className="p-4 text-sm">{formatDate(log.timestamp)}</td>
                        <td className="p-4 text-sm max-w-xs truncate">{log.message}</td>
                        <td className="p-4 text-sm text-muted-foreground">{log.route || '-'}</td>
                        <td className="p-4 text-sm text-muted-foreground">{log.component || '-'}</td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            Ver detalhes
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Log Details Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && getLevelIcon(selectedLog.level)}
                Detalhes do Log
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID</label>
                    <p className="text-sm font-mono">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="text-sm">{formatDate(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nível</label>
                    <p>{getLevelBadge(selectedLog.level)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Componente</label>
                    <p className="text-sm">{selectedLog.component || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rota</label>
                    <p className="text-sm">{selectedLog.route || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">URL</label>
                    <p className="text-sm truncate">{selectedLog.url || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mensagem</label>
                  <p className="text-sm bg-muted p-3 rounded-lg mt-1">{selectedLog.message}</p>
                </div>

                {selectedLog.stack && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                    <pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-64">
                      {selectedLog.stack}
                    </pre>
                  </div>
                )}

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Detalhes</label>
                    <pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-64">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                    <p className="text-xs bg-muted p-3 rounded-lg mt-1 break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
