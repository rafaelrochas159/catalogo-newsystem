"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import Link from 'next/link';

/**
 * Página de recuperação de senha.
 * Envia um e-mail de redefinição de senha usando o Supabase Auth.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/resetar-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Erro ao enviar e-mail de recuperação.');
    } else {
      toast.success('E-mail enviado! Verifique sua caixa de entrada.');
    }
  }

  return (
    <div className="container max-w-md mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Recuperar senha</h1>
      <form onSubmit={handleReset} className="space-y-4">
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
        </Button>
      </form>
      <div className="mt-4 text-sm text-center">
        <p>
          Lembrou sua senha?{' '}
          <Link href="/login" className="text-neon-blue hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}