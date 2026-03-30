'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeCpfCnpj, normalizePhone, validateProfilePayload } from '@/lib/customer-validation';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';
import { supabase } from '@/lib/supabase/client';

export function ProfileTab({ profile, onSaved }: { profile: any; onSaved: (v: any) => void }) {
  const [form, setForm] = useState({
    nome: profile?.nome || '',
    telefone: profile?.telefone || '',
    email: profile?.email || '',
    cpf_cnpj: profile?.cpf_cnpj || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      nome: profile?.nome || '',
      telefone: profile?.telefone || '',
      email: profile?.email || '',
      cpf_cnpj: profile?.cpf_cnpj || '',
    });
  }, [profile]);

  async function save() {
    const validationError = validateProfilePayload(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessao expirada. Entre novamente para continuar.');
      }

      const payload = {
        nome: form.nome.trim(),
        telefone: normalizePhone(form.telefone),
        email: form.email.trim(),
        cpf_cnpj: normalizeCpfCnpj(form.cpf_cnpj),
      };

      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await readJsonSafely<{ data?: any; error?: string }>(res);

      if (process.env.NODE_ENV !== 'production') {
        console.info('[profile-tab] save response', { status: res.status, ok: res.ok });
      }

      if (!res.ok) {
        throw new Error(getResponseErrorMessage(res, json, 'Erro ao salvar dados.'));
      }

      if (!json?.data) {
        throw new Error('Nao foi possivel atualizar seus dados.');
      }

      const nextProfile = {
        ...json.data,
        telefone: payload.telefone,
        cpf_cnpj: payload.cpf_cnpj,
      };

      setForm({
        nome: nextProfile.nome || '',
        telefone: nextProfile.telefone || '',
        email: nextProfile.email || '',
        cpf_cnpj: nextProfile.cpf_cnpj || '',
      });
      onSaved(nextProfile);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Telefone</Label>
            <Input id="profile-phone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="11999999999" inputMode="tel" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-cpf">CPF/CNPJ</Label>
            <Input id="profile-cpf" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder="00000000000 ou 00000000000000" inputMode="numeric" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input id="profile-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="voce@empresa.com" disabled />
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
