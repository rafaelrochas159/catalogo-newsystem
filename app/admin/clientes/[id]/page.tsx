import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Receipt, ShieldAlert, User } from 'lucide-react';
import { requireAdminPage } from '@/lib/auth/server';
import { getAdminCustomerDetail } from '@/lib/admin-customers';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminCustomerActions } from '../_components/AdminCustomerActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR');
}

function formatAddress(address: any) {
  if (!address) return 'Sem endereco cadastrado';
  const lines = [
    [address.rua || address.street, address.numero || address.number].filter(Boolean).join(', '),
    address.complemento || address.complement || null,
    address.bairro || address.neighborhood || null,
    [address.cidade || address.city, address.estado || address.state].filter(Boolean).join(' - '),
    address.cep ? `CEP ${address.cep}` : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join(' | ') : 'Sem endereco cadastrado';
}

export default async function AdminClienteDetalhePage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const result = await getAdminCustomerDetail(params.id);

  if (!result.customer && !result.error) {
    return notFound();
  }

  if (!result.customer) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-6">
            <p className="font-medium">Nao foi possivel abrir o cliente.</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customer = result.customer;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/clientes" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para clientes
          </Link>
          <h1 className="text-3xl font-bold">{customer.nome || 'Cliente sem nome'}</h1>
          <p className="mt-2 text-muted-foreground">{customer.email || 'Sem e-mail'} • {customer.telefone || 'Sem telefone'}</p>
        </div>
        <AdminCustomerActions
          userId={customer.userId}
          status={customer.status}
          canDeletePermanently={customer.deletionPolicy.canDeletePermanently}
          canDeactivate={!customer.isLegacyOnly && customer.deletionPolicy.canDeactivate}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={customer.status === 'inativo' ? 'secondary' : 'default'}>{customer.status || 'ativo'}</Badge>
              {customer.isLegacyOnly && <Badge variant="outline">Legado</Badge>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pedidos</p>
            <p className="mt-2 text-3xl font-bold">{customer.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total comprado</p>
            <p className="mt-2 text-3xl font-bold">{formatPrice(customer.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Ultima atividade</p>
            <p className="mt-2 text-sm font-medium">{formatDate(customer.lastActivity)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex gap-3 p-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium">Politica de remocao segura</p>
            <p className="mt-1 text-sm text-muted-foreground">{customer.deletionPolicy.reason}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><strong>Nome:</strong> {customer.nome || '—'}</div>
            <div><strong>E-mail:</strong> {customer.email || '—'}</div>
            <div><strong>Telefone:</strong> {customer.telefone || '—'}</div>
            <div><strong>CPF/CNPJ:</strong> {customer.cpfCnpj || '—'}</div>
            <div><strong>Cadastro:</strong> {formatDate(customer.createdAt)}</div>
            <div><strong>Ultima atividade:</strong> {formatDate(customer.lastActivity)}</div>
            <div><strong>User ID:</strong> <span className="break-all text-muted-foreground">{customer.userId}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Enderecos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum endereco cadastrado.</p>
            ) : (
              customer.addresses.map((address) => (
                <div key={address.id || `${customer.userId}-${address.cep || 'address'}`} className="rounded-xl border p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2">
                    {address.principal && <Badge variant="outline">Principal</Badge>}
                    <span className="text-muted-foreground">{formatDate(address.updated_at || address.created_at)}</span>
                  </div>
                  <p>{formatAddress(address)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Pedidos relacionados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customer.orders.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Cliente sem pedidos vinculados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status do pedido</TableHead>
                  <TableHead>Status do pagamento</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.numero_pedido || order.id}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{order.status_pedido || '—'}</TableCell>
                    <TableCell>{order.status_pagamento || '—'}</TableCell>
                    <TableCell>{formatPrice(Number(order.total || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
