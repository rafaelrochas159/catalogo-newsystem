'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';
import toast from 'react-hot-toast';

export function ProfileTab({ profile, onSaved }: { profile: any; onSaved: (v: any) => void }) {
  const [form, setForm] = useState({
    nome: profile?.nome || '',
    telefone: profile?.telefone || '',
    email: profile?.email || '',
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessao expirada. Entre novamente para continuar.');
      }

      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await readJsonSafely<{ data?: any; error?: string }>(res);

      if (!res.ok) {
        throw new Error(getResponseErrorMessage(res, json, 'Erro ao salvar dados.'));
      }

      if (!json?.data) {
        throw new Error('Nao foi possivel atualizar seus dados.');
      }

      onSaved(json.data);
      toast.success('Seus dados foram atualizados.');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-neon-blue/15">
      <CardHeader>
        <CardTitle>Meus dados</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="profile-name">Nome</Label>
          <Input id="profile-name" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Seu nome" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Telefone</Label>
            <Input id="profile-phone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input id="profile-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="voce@empresa.com" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading} className="bg-neon-blue text-black hover:bg-neon-blue/90">
            {loading ? 'Salvando...' : 'Salvar dados'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

