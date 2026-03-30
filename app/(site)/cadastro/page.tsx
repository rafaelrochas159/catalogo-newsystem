"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateRegistrationPayload } from '@/lib/customer-validation';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data?.session) {
        router.replace('/');
      }
    });
  }, [router]);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateRegistrationPayload({
      nome: name,
      email,
      password,
      telefone: phone,
      cpf_cnpj: cpfCnpj,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: name,
          email,
          password,
          telefone: phone,
          cpf_cnpj: cpfCnpj,
        }),
      });

      const json = await readJsonSafely<{ data?: { user_id?: string }; error?: string }>(response);

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, json, 'Nao foi possivel concluir o cadastro.')
        );
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        toast.success('Cadastro concluido. Entre com seu e-mail e senha para continuar.');
        setLoading(false);
        router.replace('/login');
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      setLoading(false);
      router.replace('/');
    } catch (registerError: any) {
      toast.error(registerError?.message || 'Erro ao cadastrar usuario.');
      setLoading(false);
    }
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
          <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
          <Input
            id="cpfCnpj"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 90000-0000"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Registrando...' : 'Criar conta'}
        </Button>
      </form>
      <div className="mt-4 text-sm text-center">
        <p>
          Ja tem conta?{' '}
          <Link href="/login" className="text-neon-blue hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
