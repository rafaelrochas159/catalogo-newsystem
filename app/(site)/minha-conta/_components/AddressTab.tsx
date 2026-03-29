'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AddressTab({ addresses, onSaved }: { addresses: any[]; onSaved: (v: any) => void }) {
  const main = addresses?.[0] || {};
  const [form, setForm] = useState({ cep: main.cep || '', rua: main.rua || '', numero: main.numero || '', complemento: main.complemento || '', bairro: main.bairro || '', cidade: main.cidade || '', estado: main.estado || '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    const res = await fetch(`/api/viacep/${clean}`);
    const json = await res.json();
    if (json.data) {
      setForm((p) => ({ ...p, rua: json.data.logradouro || '', bairro: json.data.bairro || '', cidade: json.data.localidade || '', estado: json.data.uf || '' }));
    }
    setLoadingCep(false);
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/account/address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    onSaved(json.data);
    setSaving(false);
  }

  return <div className="space-y-4 max-w-xl"><Input value={form.cep} onChange={(e)=>{ const v=e.target.value; setForm({...form,cep:v}); lookupCep(v); }} placeholder="CEP" />{loadingCep && <p className="text-sm text-muted-foreground">Buscando CEP...</p>}<Input value={form.rua} onChange={(e)=>setForm({...form,rua:e.target.value})} placeholder="Rua" /><Input value={form.numero} onChange={(e)=>setForm({...form,numero:e.target.value})} placeholder="Número" /><Input value={form.complemento} onChange={(e)=>setForm({...form,complemento:e.target.value})} placeholder="Complemento" /><Input value={form.bairro} onChange={(e)=>setForm({...form,bairro:e.target.value})} placeholder="Bairro" /><Input value={form.cidade} onChange={(e)=>setForm({...form,cidade:e.target.value})} placeholder="Cidade" /><Input value={form.estado} onChange={(e)=>setForm({...form,estado:e.target.value})} placeholder="Estado" /><Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar endereço'}</Button></div>;
}
