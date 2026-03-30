alter table public.produtos
  add column if not exists related_product_ids uuid[] default '{}';

alter table public.pedidos
  add column if not exists user_id uuid,
  add column if not exists original_total numeric(10,2),
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_type text,
  add column if not exists coupon_discount_value numeric(10,2) default 0,
  add column if not exists abandoned_cart_id uuid;

create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  customer_name text,
  customer_phone text,
  cart_items jsonb not null default '[]'::jsonb,
  cart_type text,
  item_count integer not null default 0,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'active',
  source text not null default 'site',
  whatsapp_payload jsonb,
  email_payload jsonb,
  last_activity_at timestamptz not null default timezone('utc'::text, now()),
  abandoned_at timestamptz,
  recovered_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint abandoned_carts_status_check check (status in ('active', 'abandoned', 'recovered', 'converted'))
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  type text not null,
  discount_type text not null,
  discount_value numeric(10,2) not null,
  minimum_order_value numeric(10,2) not null default 0,
  max_discount_value numeric(10,2),
  usage_limit integer,
  usage_count integer not null default 0,
  per_user_limit integer not null default 1,
  product_ids uuid[] not null default '{}',
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint coupons_type_check check (type in ('FIRST_PURCHASE', 'RECURRENT', 'ABANDONED_CART', 'MIN_TICKET', 'GLOBAL')),
  constraint coupons_discount_type_check check (discount_type in ('PERCENTAGE', 'FIXED'))
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid references public.pedidos(id) on delete set null,
  user_id uuid,
  email text,
  coupon_code text not null,
  discount_value numeric(10,2) not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.favorite_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references public.produtos(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint favorite_products_user_product_key unique (user_id, product_id)
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  event_name text not null,
  page text,
  product_id uuid references public.produtos(id) on delete set null,
  order_id uuid references public.pedidos(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists produtos_related_product_ids_idx
  on public.produtos using gin (related_product_ids);

create index if not exists pedidos_user_id_idx
  on public.pedidos (user_id);

create index if not exists pedidos_coupon_code_idx
  on public.pedidos (coupon_code);

create index if not exists abandoned_carts_user_id_idx
  on public.abandoned_carts (user_id, status, updated_at desc);

create index if not exists abandoned_carts_email_idx
  on public.abandoned_carts (email, status, updated_at desc);

create index if not exists coupons_code_idx
  on public.coupons (code, is_active);

create index if not exists coupon_redemptions_coupon_id_idx
  on public.coupon_redemptions (coupon_id, created_at desc);

create index if not exists coupon_redemptions_user_idx
  on public.coupon_redemptions (user_id, email, created_at desc);

create index if not exists favorite_products_user_idx
  on public.favorite_products (user_id, created_at desc);

create index if not exists user_events_user_idx
  on public.user_events (user_id, created_at desc);

create index if not exists user_events_event_name_idx
  on public.user_events (event_name, created_at desc);

alter table public.abandoned_carts enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.favorite_products enable row level security;
alter table public.user_events enable row level security;

drop policy if exists "favorite_products_select_own" on public.favorite_products;
create policy "favorite_products_select_own"
  on public.favorite_products
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "favorite_products_insert_own" on public.favorite_products;
create policy "favorite_products_insert_own"
  on public.favorite_products
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "favorite_products_delete_own" on public.favorite_products;
create policy "favorite_products_delete_own"
  on public.favorite_products
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "abandoned_carts_select_own" on public.abandoned_carts;
create policy "abandoned_carts_select_own"
  on public.abandoned_carts
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "abandoned_carts_insert_own" on public.abandoned_carts;
create policy "abandoned_carts_insert_own"
  on public.abandoned_carts
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "abandoned_carts_update_own" on public.abandoned_carts;
create policy "abandoned_carts_update_own"
  on public.abandoned_carts
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "user_events_select_own" on public.user_events;
create policy "user_events_select_own"
  on public.user_events
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "user_events_insert_own" on public.user_events;
create policy "user_events_insert_own"
  on public.user_events
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or user_id is null
  );
