'use client';

import { useEffect, useMemo, useState } from 'react';
import { TicketPercent, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

type CouponForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  type: string;
  discount_type: string;
  discount_value: string;
  minimum_order_value: string;
  max_discount_value: string;
  usage_limit: string;
  per_user_limit: string;
  product_ids_input: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const initialForm: CouponForm = {
  code: '',
  name: '',
  description: '',
  type: 'GLOBAL',
  discount_type: 'PERCENTAGE',
  discount_value: '',
  minimum_order_value: '',
  max_discount_value: '',
  usage_limit: '',
  per_user_limit: '1',
  product_ids_input: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState<CouponForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const editing = useMemo(() => Boolean(form.id), [form.id]);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/coupons', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Erro ao carregar cupons.');
      setCoupons(Array.isArray(json.data) ? json.data : []);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar cupons.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => setForm(initialForm);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.discount_value) {
      toast.error('Codigo, nome e desconto sao obrigatorios.');
      return;
    }

    setIsSaving(true);
    try {
      const method = editing ? 'PATCH' : 'POST';
      const response = await fetch('/api/coupons', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          product_ids: form.product_ids_input
            ? form.product_ids_input.split(',').map((value) => value.trim()).filter(Boolean)
            : [],
          id: form.id,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Erro ao salvar cupom.');

      toast.success(editing ? 'Cupom atualizado.' : 'Cupom criado.');
      resetForm();
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cupom.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/coupons?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Erro ao remover cupom.');
      toast.success('Cupom removido.');
      if (form.id === id) resetForm();
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover cupom.');
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-neon-blue/10 p-3">
          <TicketPercent className="h-5 w-5 text-neon-blue" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Cupons</h1>
          <p className="text-muted-foreground">Primeira compra, recompra, carrinho abandonado e ticket minimo.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Editar cupom' : 'Novo cupom'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Codigo</Label>
              <Input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))} placeholder="PRIMEIRA10" />
            </div>
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Primeira compra 10%" />
            </div>
            <div className="grid gap-2">
              <Label>Descricao</Label>
              <Input value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Mensagem interna do cupom" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">Global</SelectItem>
                    <SelectItem value="FIRST_PURCHASE">Primeira compra</SelectItem>
                    <SelectItem value="RECURRENT">Cliente recorrente</SelectItem>
                    <SelectItem value="ABANDONED_CART">Carrinho abandonado</SelectItem>
                    <SelectItem value="MIN_TICKET">Ticket minimo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Desconto</Label>
                <Select value={form.discount_type} onValueChange={(value) => setForm((current) => ({ ...current, discount_type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentual</SelectItem>
                    <SelectItem value="FIXED">Valor fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Valor</Label>
                <Input value={form.discount_value} onChange={(e) => setForm((current) => ({ ...current, discount_value: e.target.value }))} placeholder="10" />
              </div>
              <div className="grid gap-2">
                <Label>Ticket minimo</Label>
                <Input value={form.minimum_order_value} onChange={(e) => setForm((current) => ({ ...current, minimum_order_value: e.target.value }))} placeholder="500" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Max desconto</Label>
                <Input value={form.max_discount_value} onChange={(e) => setForm((current) => ({ ...current, max_discount_value: e.target.value }))} placeholder="150" />
              </div>
              <div className="grid gap-2">
                <Label>Limite uso</Label>
                <Input value={form.usage_limit} onChange={(e) => setForm((current) => ({ ...current, usage_limit: e.target.value }))} placeholder="100" />
              </div>
              <div className="grid gap-2">
                <Label>Uso por cliente</Label>
                <Input value={form.per_user_limit} onChange={(e) => setForm((current) => ({ ...current, per_user_limit: e.target.value }))} placeholder="1" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Produtos aplicaveis</Label>
              <Input value={form.product_ids_input} onChange={(e) => setForm((current) => ({ ...current, product_ids_input: e.target.value }))} placeholder="IDs separados por virgula. Vazio = global" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Valido de</Label>
                <Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm((current) => ({ ...current, valid_from: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Valido ate</Label>
                <Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm((current) => ({ ...current, valid_until: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: Boolean(checked) }))} />
              <Label>Cupom ativo</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-neon-blue text-black hover:bg-neon-blue/90">
                {editing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editing ? 'Atualizar' : 'Criar cupom'}
              </Button>
              {editing && (
                <Button variant="outline" onClick={resetForm}>
                  Novo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cupons cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!isLoading && coupons.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum cupom cadastrado.</div>
            )}
            {coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{coupon.code}</p>
                      <span className={`rounded-full px-2 py-1 text-xs ${coupon.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {coupon.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{coupon.name}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {coupon.type} • {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `R$ ${Number(coupon.discount_value || 0).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Usos: {coupon.usage_count || 0}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setForm({
                        id: coupon.id,
                        code: coupon.code || '',
                        name: coupon.name || '',
                        description: coupon.description || '',
                        type: coupon.type || 'GLOBAL',
                        discount_type: coupon.discount_type || 'PERCENTAGE',
                        discount_value: String(coupon.discount_value || ''),
                        minimum_order_value: String(coupon.minimum_order_value || ''),
                        max_discount_value: coupon.max_discount_value ? String(coupon.max_discount_value) : '',
                        usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
                        per_user_limit: String(coupon.per_user_limit || 1),
                        product_ids_input: Array.isArray(coupon.product_ids) ? coupon.product_ids.join(', ') : '',
                        valid_from: coupon.valid_from ? String(coupon.valid_from).slice(0, 16) : '',
                        valid_until: coupon.valid_until ? String(coupon.valid_until).slice(0, 16) : '',
                        is_active: Boolean(coupon.is_active),
                      })}
                    >
                      Editar
                    </Button>
                    <Button variant="outline" onClick={() => handleDelete(coupon.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
