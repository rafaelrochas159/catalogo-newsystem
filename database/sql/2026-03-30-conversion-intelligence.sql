alter table public.pedidos
  add column if not exists anonymous_id text;

create index if not exists pedidos_anonymous_id_idx
  on public.pedidos (anonymous_id);

create table if not exists public.ab_tests (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  status text not null default 'ACTIVE',
  target_routes text[] not null default '{}'::text[],
  variants jsonb not null default '[]'::jsonb,
  conversion_event text not null default 'purchase',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.ab_test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.ab_tests(id) on delete cascade,
  test_key text not null,
  identity_key text not null,
  user_id uuid,
  email text,
  anonymous_id text,
  route text,
  variant_key text not null,
  exposure_count integer not null default 1,
  first_exposed_at timestamptz not null default timezone('utc'::text, now()),
  last_exposed_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (test_id, identity_key)
);

create index if not exists ab_test_assignments_test_idx
  on public.ab_test_assignments (test_id, variant_key, last_exposed_at desc);

create index if not exists ab_test_assignments_identity_idx
  on public.ab_test_assignments (identity_key, last_exposed_at desc);

alter table public.ab_tests enable row level security;
alter table public.ab_test_assignments enable row level security;

insert into public.ab_tests (key, name, description, target_routes, variants, conversion_event)
values (
  'home_hero_cro',
  'Home Hero CRO',
  'Teste de copy e CTA do hero para aumentar entrada qualificada no catalogo.',
  array['/'],
  '[
    {"key":"control","title":"NEW SYSTEM DISTRIBUIDORA","subtitle":"Desde 2016 oferecendo qualidade, preco competitivo e atendimento rapido no mercado de acessorios para celular.","primaryCta":"Catalogo Unitario","secondaryCta":"Caixa Fechada","badge":"Distribuidora de Acessorios para Celular"},
    {"key":"oferta","title":"Compre rapido. Reponha melhor.","subtitle":"Produtos com giro alto, envio agil e condicoes para aumentar sua margem desde o primeiro pedido.","primaryCta":"Comprar com oferta","secondaryCta":"Ver caixas fechadas","badge":"Oferta valida para atacado e reposicao"},
    {"key":"urgencia","title":"Reposicao pronta para vender.","subtitle":"Mais vendidos, destaques e oportunidades de caixa fechada para acelerar sua decisao e seu ticket medio.","primaryCta":"Ver mais vendidos","secondaryCta":"Levar em caixa","badge":"Estoque com giro real e envio rapido"}
  ]'::jsonb,
  'purchase'
)
on conflict (key) do nothing;
