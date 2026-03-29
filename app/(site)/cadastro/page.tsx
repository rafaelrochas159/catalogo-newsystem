"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import Link from 'next/link';

/**
 * Página de cadastro de clientes.
 * Permite ao usuário criar uma conta com e-mail, senha e dados pessoais
 * como nome, CPF/CNPJ e endereço completo. Após o cadastro, o usuário
 * é autenticado automaticamente e redirecionado para a home.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/');
      }
    });
  }, [router]);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password || !name) {
      toast.error('Preencha nome, e-mail e senha.');
      return;
    }
    setLoading(true);
    // Cria usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error || !data?.user) {
      setLoading(false);
      toast.error(error?.message || 'Erro ao cadastrar usuário.');
      return;
    }
    const user = data.user;
    // Insere registro na tabela 'clientes' com os dados adicionais
    const { error: dbError } = await supabase.from('clientes').insert({
      id: user.id,
      nome: name.trim(),
      email: email.trim(),
      cpf_cnpj: cpfCnpj.trim() || null,
      telefone: phone.trim() || null,
    });
    setLoading(false);
    if (dbError) {
      toast.error(dbError.message || 'Erro ao salvar dados do cliente.');
      return;
    }
    toast.success('Cadastro realizado com sucesso!');
    router.replace('/');
  }

  return (
    <div className="container max-w-lg mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Cadastre-se</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escolha uma senha"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">CPF ou CNPJ (opcional)</Label>
          <Input
            id="cpfCnpj"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone (opcional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 90000-0000"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Registrando...' : 'Criar conta'}
        </Button>
      </form>
      <div className="mt-4 text-sm text-center">
        <p>
          Já tem conta?{' '}
          <Link href="/login" className="text-neon-blue hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}