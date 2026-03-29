"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

/**
 * Página "Minha conta" para clientes autenticados. Permite visualizar e editar
 * informações pessoais (nome, telefone, CPF/CNPJ) e endereço. Também exibe
 * link para consultar pedidos. Redireciona para login se o cliente não estiver
 * autenticado.
 */
export default function MyAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setClienteId(session.user.id);
      // Busca dados do cliente
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('nome, email, telefone, cpf_cnpj, endereco')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        if (data) {
          setNome(data.nome || '');
          setEmail(data.email || '');
          setTelefone(data.telefone || '');
          setCpfCnpj(data.cpf_cnpj || '');
          if (data.endereco) {
            setCep(data.endereco.cep || '');
            setRua(data.endereco.rua || '');
            setNumero(data.endereco.numero || '');
            setBairro(data.endereco.bairro || '');
            setCidade(data.endereco.cidade || '');
            setEstado(data.endereco.estado || '');
            setComplemento(data.endereco.complemento || '');
          }
        }
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('clientes') || message.includes('schema cache')) {
          console.warn('Tabela clientes não encontrada. Execute o script SQL para criá-la.', message);
          // continua com dados em branco
        } else {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!clienteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          cpf_cnpj: cpfCnpj.trim() || null,
          endereco: {
            cep: cep.trim(),
            rua: rua.trim(),
            numero: numero.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            estado: estado.trim(),
            complemento: complemento.trim() || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteId);
      if (error) throw error;
      toast.success('Dados atualizados com sucesso.');
    } catch (error: any) {
      const message = error?.message || '';
      if (message.includes('clientes') || message.includes('schema cache')) {
        console.warn('Tabela clientes não encontrada. Execute o script SQL para criá-la.', message);
        toast.error('Funcionalidade indisponível: tabela de clientes não está criada.');
      } else {
        toast.error(message || 'Erro ao atualizar dados.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Minha conta</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
          <Input id="cpf_cnpj" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
        </div>
        <hr className="my-4" />
        <h2 className="text-xl font-semibold">Endereço</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="rua">Rua</Label>
            <Input id="rua" value={rua} onChange={(e) => setRua(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div className="col-span-1 space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
      </form>
      <div className="pt-6">
        <a href="/meus-pedidos" className="text-neon-blue hover:underline">Ver meus pedidos</a>
      </div>
    </div>
  );
}