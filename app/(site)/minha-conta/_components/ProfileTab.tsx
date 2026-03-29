'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProfileTab({ profile, onSaved }: { profile: any; onSaved: (v: any) => void }) {
  const [form, setForm] = useState({ nome: profile?.nome || '', telefone: profile?.telefone || '', email: profile?.email || '' });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch('/api/account/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    onSaved(json.data);
    setLoading(false);
  }

  return <div className="space-y-4 max-w-xl"><Input value={form.nome} onChange={(e)=>setForm({...form,nome:e.target.value})} placeholder="Nome" /><Input value={form.telefone} onChange={(e)=>setForm({...form,telefone:e.target.value})} placeholder="Telefone" /><Input value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="E-mail" /><Button onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar dados'}</Button></div>;
}
