"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { Cliente } from '@/types';
import toast from 'react-hot-toast';

/**
 * Página de clientes para o administrador.
 * Lista todos os clientes cadastrados no sistema com dados básicos e CPF/CNPJ.
 */
export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setClientes((data as Cliente[]) || []);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes cadastrados na plataforma.</p>
        </div>
        <Button variant="outline" onClick={fetchClientes}>Atualizar</Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Endereço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : clientes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum cliente encontrado.</TableCell></TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{cliente.telefone || '—'}</TableCell>
                    <TableCell>{cliente.cpf_cnpj || '—'}</TableCell>
                    <TableCell>
                      {cliente.endereco ? (
                        <div className="text-sm">
                          <div>{cliente.endereco?.rua}, {cliente.endereco?.numero}</div>
                          <div>{cliente.endereco?.cidade} - {cliente.endereco?.estado}</div>
                          <div>{cliente.endereco?.cep}</div>
                        </div>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}