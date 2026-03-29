"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import toast from 'react-hot-toast';

/**
 * Página de login de clientes.
 * Permite que o usuário insira e-mail e senha para autenticar-se via Supabase.
 * Se o usuário já estiver autenticado, redireciona para a página principal.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Se já houver sessão, redireciona para a página inicial
    supabase.auth.getSession().then((res: any) => {
      const { data } = res;
      if (data?.session) {
        router.replace('/');
      }
    });
  }, [router]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Erro ao fazer login.');
    } else {
      toast.success('Login realizado com sucesso!');
      router.replace('/');
    }
  }

  return (
    <div className="container max-w-md mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Entrar</h1>
      <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <div className="mt-4 text-sm text-center space-y-2">
        <p>
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-neon-blue hover:underline">
            Cadastrar-se
          </Link>
        </p>
        <p>
          Esqueceu sua senha?{' '}
          <Link href="/esqueci-senha" className="text-neon-blue hover:underline">
            Recuperar senha
          </Link>
        </p>
      </div>
    </div>
  );
}