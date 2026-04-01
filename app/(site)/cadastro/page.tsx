"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  validateAddressPayload,
  validateRegistrationPayload,
} from '@/lib/customer-validation';
import { getResponseErrorMessage, readJsonSafely } from '@/lib/http';
import { supabase } from '@/lib/supabase/client';

type RegisterAddressForm = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<RegisterAddressForm>({
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data?.session) {
        router.replace('/');
      }
    });
  }, [router]);

  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`/api/viacep/${clean}`);
      const json = await readJsonSafely<{ data?: any; error?: string }>(res);

      if (!res.ok || !json?.data) {
        throw new Error(getResponseErrorMessage(res, json, 'Nao foi possivel consultar o CEP.'));
      }

      setAddress((current) => ({
        ...current,
        rua: json.data.logradouro || current.rua,
        bairro: json.data.bairro || current.bairro,
        cidade: json.data.localidade || current.cidade,
        estado: (json.data.uf || current.estado || '').toUpperCase().slice(0, 2),
        complemento: current.complemento || json.data.complemento || '',
      }));
    } catch (error: any) {
      toast.error(error?.message || 'Nao foi possivel consultar o CEP.');
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    const validationError =
      validateRegistrationPayload({
        nome: name,
        email,
        password,
        telefone: phone,
        cpf_cnpj: cpfCnpj,
      }) ||
      validateAddressPayload(address);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: name,
          email,
          password,
          telefone: phone,
          cpf_cnpj: cpfCnpj,
          cep: address.cep,
          rua: address.rua,
          numero: address.numero,
          complemento: address.complemento,
          bairro: address.bairro,
          cidade: address.cidade,
          estado: address.estado,
        }),
      });

      const json = await readJsonSafely<{ data?: { user_id?: string }; error?: string }>(response);

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(response, json, 'Nao foi possivel concluir o cadastro.')
        );
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        toast.success('Cadastro concluido. Entre com seu e-mail e senha para continuar.');
        setLoading(false);
        router.replace('/login');
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      setLoading(false);
      router.replace('/');
    } catch (registerError: any) {
      toast.error(registerError?.message || 'Erro ao cadastrar usuario.');
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <div className="mx-auto max-w-2xl rounded-[28px] border border-neon-blue/15 bg-card/70 p-6 shadow-[0_20px_80px_rgba(0,243,255,0.06)] sm:p-8">
        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">
            Cadastro rapido com endereco pronto para checkout
          </p>
          <h1 className="text-3xl font-bold">Cadastre-se</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Criamos sua conta com dados pessoais e endereco principal para reduzir friccao no checkout e na recompra.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Dados pessoais</h2>
              <p className="text-sm text-muted-foreground">
                Usamos esses dados para identificar sua conta, liberar pedidos e agilizar o atendimento.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
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
                  placeholder="Escolha uma senha"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 90000-0000"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border/60 pt-6">
            <div>
              <h2 className="text-lg font-semibold">Endereco principal</h2>
              <p className="text-sm text-muted-foreground">
                Esse endereco ja fica salvo na sua conta e entra automaticamente no checkout. Complemento continua opcional.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[180px_1fr_120px]">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={address.cep}
                    onChange={(e) => {
                      const value = formatCep(e.target.value);
                      setAddress((current) => ({ ...current, cep: value }));
                      void lookupCep(value);
                    }}
                    placeholder="00000-000"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    value={address.rua}
                    onChange={(e) => setAddress((current) => ({ ...current, rua: e.target.value }))}
                    placeholder="Nome da rua"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Numero</Label>
                  <Input
                    id="numero"
                    value={address.numero}
                    onChange={(e) => setAddress((current) => ({ ...current, numero: e.target.value }))}
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              {loadingCep && (
                <p className="text-sm text-muted-foreground">Buscando endereco pelo CEP...</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={address.complemento}
                  onChange={(e) => setAddress((current) => ({ ...current, complemento: e.target.value }))}
                  placeholder="Apartamento, bloco, sala ou referencia"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={address.bairro}
                    onChange={(e) => setAddress((current) => ({ ...current, bairro: e.target.value }))}
                    placeholder="Bairro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={address.cidade}
                    onChange={(e) => setAddress((current) => ({ ...current, cidade: e.target.value }))}
                    placeholder="Cidade"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={address.estado}
                    onChange={(e) =>
                      setAddress((current) => ({
                        ...current,
                        estado: e.target.value.toUpperCase().slice(0, 2),
                      }))
                    }
                    placeholder="UF"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <Button type="submit" disabled={loading} className="w-full bg-neon-blue text-black hover:bg-neon-blue/90">
            {loading ? 'Registrando...' : 'Criar conta'}
          </Button>
        </form>
      </div>

      <div className="mt-4 text-sm text-center">
        <p>
          Ja tem conta?{' '}
          <Link href="/login" className="text-neon-blue hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
