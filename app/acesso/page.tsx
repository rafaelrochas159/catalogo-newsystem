"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface AccessState {
  acesso_liberado: boolean;
  liberado_em?: string | null;
  ultimo_numero_pedido?: string | null;
  nome?: string | null;
}

export default function BuyerAccessPage() {
  const [email, setEmail] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [access, setAccess] = useState<AccessState | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentEmail = session?.user?.email ?? null;
      setSessionEmail(currentEmail);
      if (currentEmail) {
        await loadAccess(currentEmail);
      } else {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const loadAccess = async (userEmail: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('compradores_acesso')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error) {
      setAccess(null);
    } else {
      setAccess(data as any);
    }

    setIsLoading(false);
  };

  const handleSendMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/acesso`,
        },
      });

      if (error) throw error;
      toast.success('Enviamos um link de acesso para o seu e-mail.');
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível enviar o link de acesso.');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setAccess(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-neon-blue/5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-neon-blue/20 flex items-center justify-center">
                <Lock className="h-6 w-6 text-neon-blue" />
              </div>
              <div>
                <CardTitle>Acesso do comprador</CardTitle>
                <CardDescription>Entre com seu e-mail para verificar se o pagamento Pix já foi aprovado.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sessionEmail ? (
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer-email">Seu e-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="buyer-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-neon-blue text-black hover:bg-neon-blue/90" disabled={isSending}>
                  {isSending ? 'Enviando link...' : 'Receber link de acesso'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail autenticado</p>
                    <p className="font-medium">{sessionEmail}</p>
                  </div>
                  <Button variant="outline" onClick={handleLogout}>Sair</Button>
                </div>

                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Consultando status do seu acesso...</div>
                ) : access ? (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Comprador</p>
                        <p className="font-semibold">{access.nome || sessionEmail}</p>
                      </div>
                      <Badge variant={access.acesso_liberado ? 'default' : 'secondary'}>
                        {access.acesso_liberado ? 'Acesso liberado' : 'Aguardando aprovação'}
                      </Badge>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Último pedido</p>
                        <p className="font-medium">{access.ultimo_numero_pedido || 'Sem pedido vinculado'}</p>
                      </div>
                      {access.liberado_em && (
                        <div>
                          <p className="text-muted-foreground">Liberado em</p>
                          <p className="font-medium">{new Date(access.liberado_em).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                    {access.acesso_liberado && (
                      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4 text-sm flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-500">Pagamento aprovado</p>
                          <p>Seu acesso está liberado. Você já pode continuar usando os recursos destinados a compradores.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    Ainda não encontramos compra aprovada para esse e-mail. Se você acabou de pagar via Pix, aguarde o webhook confirmar e tente novamente em instantes.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
