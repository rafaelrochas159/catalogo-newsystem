"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

/**
 * Página de redefinição de senha.
 * Obtém o token da query string e permite definir uma nova senha.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [type, setType] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Obtém parâmetros da URL manualmente (não usa useSearchParams para evitar Suspense)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setToken(params.get('token') || '');
      setType(params.get('type') || '');
    }
  }, []);

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!password || password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Erro ao redefinir a senha.');
    } else {
      toast.success('Senha redefinida com sucesso!');
      router.replace('/login');
    }
  }

  // Verifica se o link de redefinição é válido
  if (!token || type !== 'recovery') {
    return (
      <div className="container max-w-md mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold">Link inválido</h1>
        <p className="mt-2">O link de recuperação é inválido ou já foi utilizado.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Redefinir senha</h1>
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a nova senha"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme a nova senha"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </Button>
      </form>
    </div>
  );
}