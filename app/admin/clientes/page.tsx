import Link from 'next/link';
import { Eye, Search, Users } from 'lucide-react';
import { requireAdminPage } from '@/lib/auth/server';
import { listAdminCustomers } from '@/lib/admin-customers';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR');
}

function statusVariant(status: string) {
  if (status === 'inativo') return 'secondary';
  return 'default';
}

function presenceVariant(status: 'online' | 'recent' | 'offline') {
  if (status === 'online') return 'success';
  if (status === 'recent') return 'warning';
  return 'outline';
}

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  await requireAdminPage();
  const query = String(searchParams?.q || '').trim();
  const status = String(searchParams?.status || '').trim();
  const result = await listAdminCustomers({ query, status });

  const statCards = [
    { label: 'Clientes visiveis', value: result.totalCustomers },
    { label: 'Clientes ativos', value: result.totalActive },
    { label: 'Com pedidos', value: result.totalWithOrders },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="mt-2 text-muted-foreground">
            Base administrativa consolidada a partir de customer_profiles, enderecos e historico de pedidos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Buscar por nome, email, telefone, CPF/CNPJ ou ID"
                className="pl-10"
              />
            </div>
            <Input
              name="status"
              defaultValue={status}
              placeholder="Status: ativo ou inativo"
            />
            <div className="flex gap-2">
              <Button type="submit" className="bg-neon-blue text-black hover:bg-neon-blue/90">Filtrar</Button>
              <Button type="reset" variant="outline" asChild>
                <Link href="/admin/clientes">Limpar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.error ? (
        <Card>
          <CardContent className="p-6">
            <p className="font-medium">Nao foi possivel carregar os clientes.</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      ) : result.customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Nenhum cliente encontrado.</p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Ajuste os filtros ou aguarde novos cadastros. A tela agora mostra explicitamente vazio em vez de falhar silenciosamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Endereco</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total comprado</TableHead>
                  <TableHead>Presenca</TableHead>
                  <TableHead>Ultima atividade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.customers.map((customer) => (
                  <TableRow key={customer.userId}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{customer.nome || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(customer.createdAt)}</p>
                        {customer.isLegacyOnly && (
                          <Badge variant="outline" className="mt-1">Legado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{customer.email || 'Sem e-mail'}</p>
                        <p className="text-muted-foreground">{customer.telefone || 'Sem telefone'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{customer.cpfCnpj || '—'}</TableCell>
                    <TableCell>
                      {customer.hasAddress ? (
                        <span className="text-sm">
                          {customer.addressCount > 1 ? `${customer.addressCount} enderecos` : 'Endereco cadastrado'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem endereco</span>
                      )}
                    </TableCell>
                    <TableCell>{customer.orderCount}</TableCell>
                    <TableCell className="font-medium">{formatPrice(customer.totalSpent)}</TableCell>
                    <TableCell>
                      <Badge variant={presenceVariant(customer.presenceStatus) as any}>
                        {customer.presenceLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(customer.lastActivity)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(customer.status) as any}>{customer.status || 'ativo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/clientes/${customer.userId}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Abrir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
