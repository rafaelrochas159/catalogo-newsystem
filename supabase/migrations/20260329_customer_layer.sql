create extension if not exists pgcrypto;

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  nome text,
  telefone text,
  cpf_cnpj text,
  status text not null default 'ativo' check (status in ('ativo','inativo','bloqueado')),
  observacoes_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.customer_profiles(id) on delete cascade,
  cep text not null,
  rua text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  estado text not null,
  principal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pedidos add column if not exists user_id uuid;
alter table public.pedidos add column if not exists fulfillment_status text not null default 'aguardando_pagamento';

create index if not exists idx_customer_addresses_user_id on public.customer_addresses(user_id);
create index if not exists idx_pedidos_user_id on public.pedidos(user_id);
create index if not exists idx_customer_profiles_status on public.customer_profiles(status);

create or replace function public.handle_customer_profile_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_customer_profiles_updated_at
before update on public.customer_profiles
for each row execute function public.handle_customer_profile_updated_at();

create or replace trigger trg_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.handle_customer_profile_updated_at();
