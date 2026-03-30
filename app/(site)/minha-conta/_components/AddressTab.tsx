'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';
import { validateAddressPayload } from '@/lib/customer-validation';
import { supabase } from '@/lib/supabase/client';

function buildAddressForm(address: any) {
  return {
    cep: address?.cep || '',
    rua: address?.rua || '',
    numero: address?.numero || '',
    complemento: address?.complemento || '',
    bairro: address?.bairro || '',
    cidade: address?.cidade || '',
    estado: address?.estado || '',
  };
}

export function AddressTab({ addresses, onSaved }: { addresses: any[]; onSaved: (v: any) => void }) {
  const [form, setForm] = useState(buildAddressForm(addresses?.[0] || {}));
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildAddressForm(addresses?.[0] || {}));
  }, [addresses]);

  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`/api/viacep/${clean}`);
      const json = await readJsonSafely<{ data?: any }>(res);
      if (json?.data) {
        setForm((current) => ({
          ...current,
          rua: json.data.logradouro || '',
          bairro: json.data.bairro || '',
          cidade: json.data.localidade || '',
          estado: json.data.uf || '',
        }));
      }
    } finally {
      setLoadingCep(false);
    }
  }

  async function save() {
    const validationError = validateAddressPayload(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessao expirada. Entre novamente para continuar.');
      }

      const payload = {
        ...form,
        cep: form.cep.trim(),
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        complemento: form.complemento.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase(),
      };

      const res = await fetch('/api/account/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await readJsonSafely<{ data?: any; error?: string }>(res);

      if (process.env.NODE_ENV !== 'production') {
        console.info('[address-tab] save response', { status: res.status, ok: res.ok });
      }

      if (!res.ok) {
        throw new Error(getResponseErrorMessage(res, json, 'Erro ao salvar endereco.'));
      }

      if (!json?.data) {
        throw new Error('Nao foi possivel atualizar seu endereco.');
      }

      setForm(buildAddressForm(json.data));
      onSaved(json.data);
      toast.success('Endereco atualizado com sucesso.');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar endereco.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-neon-blue/15">
      <CardHeader>
        <CardTitle>Endereco principal</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[180px_1fr_120px]">
          <div className="grid gap-2">
            <Label htmlFor="address-cep">CEP</Label>
            <Input
              id="address-cep"
              value={form.cep}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, cep: value });
                void lookupCep(value);
              }}
              placeholder="00000-000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address-street">Rua</Label>
            <Input id="address-street" value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} placeholder="Rua" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address-number">Numero</Label>
            <Input id="address-number" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="123" />
          </div>
        </div>
        {loadingCep && <p className="text-sm text-muted-foreground">Buscando CEP...</p>}
        <div className="grid gap-2">
          <Label htmlFor="address-extra">Complemento</Label>
          <Input id="address-extra" value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} placeholder="Sala, bloco, referencia" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="address-neighborhood">Bairro</Label>
            <Input id="address-neighborhood" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} placeholder="Bairro" />
          </div>
          <div className="grid gap-2 sm:col-span-1">
            <Label htmlFor="address-city">Cidade</Label>
            <Input id="address-city" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Cidade" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address-state">Estado</Label>
            <Input id="address-state" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="UF" maxLength={2} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-neon-blue text-black hover:bg-neon-blue/90">
            {saving ? 'Salvando...' : 'Salvar endereco'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
