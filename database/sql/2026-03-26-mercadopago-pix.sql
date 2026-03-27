-- Mercado Pago Pix + webhook + acesso do comprador
-- Executar no SQL Editor do Supabase antes do deploy.

create extension if not exists "uuid-ossp";

alter table public.pedidos
  add column if not exists endereco jsonb,
  add column if not exists checkout_token text,
  add column if not exists status_pedido text default 'aguardando_pagamento',
  add column if not exists status_pagamento text default 'pending',
  add column if not exists forma_pagamento text,
  add column if not exists gateway text,
  add column if not exists payment_id_gateway text,
  add column if not exists external_reference text,
  add column if not exists pix_qr_code text,
  add column if not exists pix_copia_cola text,
  add column if not exists payment_gateway_response jsonb,
  add column if not exists status_gateway_detalhe text,
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists pedidos_checkout_token_idx on public.pedidos(checkout_token);
create index if not exists pedidos_external_reference_idx on public.pedidos(external_reference);
create index if not exists pedidos_status_pagamento_idx on public.pedidos(status_pagamento);

create table if not exists public.pagamentos (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid references public.pedidos(id) on delete set null,
  numero_pedido text not null,
  gateway text not null,
  forma_pagamento text not null,
  payment_id_gateway text not null unique,
  external_reference text not null,
  qr_code text,
  pix_copia_cola text,
  status_pagamento text not null,
  valor numeric(12,2) not null,
  payload_gateway jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  paid_at timestamptz
);

create index if not exists pagamentos_numero_pedido_idx on public.pagamentos(numero_pedido);
create index if not exists pagamentos_external_reference_idx on public.pagamentos(external_reference);
create index if not exists pagamentos_status_pagamento_idx on public.pagamentos(status_pagamento);

create table if not exists public.compradores_acesso (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  nome text,
  telefone text,
  acesso_liberado boolean not null default false,
  ultimo_numero_pedido text,
  liberado_em timestamptz,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz
);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_pedidos_updated_at on public.pedidos;
create trigger update_pedidos_updated_at
  before update on public.pedidos
  for each row
  execute function public.update_updated_at_column();

alter table public.pagamentos enable row level security;
alter table public.compradores_acesso enable row level security;

-- recria policies de forma compatível com o Postgres do Supabase
DROP POLICY IF EXISTS "Pagamentos somente autenticados leem" ON public.pagamentos;
create policy "Pagamentos somente autenticados leem"
on public.pagamentos
for select
to authenticated
using (true);

DROP POLICY IF EXISTS "Comprador le proprio acesso" ON public.compradores_acesso;
create policy "Comprador le proprio acesso"
on public.compradores_acesso
for select
to authenticated
using ((auth.jwt() ->> 'email') = email);
