create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  anonymous_id text,
  event_name text not null,
  standard_event text,
  funnel_stage text,
  page text,
  product_id uuid references public.produtos(id) on delete set null,
  order_id uuid references public.pedidos(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.user_funnel_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  anonymous_id text,
  current_stage text not null,
  last_event_name text not null,
  first_seen_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  order_id uuid references public.pedidos(id) on delete set null,
  phone text not null,
  template_key text not null,
  dedupe_key text not null unique,
  provider text not null,
  direction text not null default 'outbound',
  status text not null default 'queued',
  provider_message_id text,
  payload jsonb not null default '{}'::jsonb,
  response jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists marketing_events_user_idx
  on public.marketing_events (user_id, created_at desc);

create index if not exists marketing_events_email_idx
  on public.marketing_events (email, created_at desc);

create index if not exists marketing_events_funnel_idx
  on public.marketing_events (funnel_stage, created_at desc);

create index if not exists marketing_events_standard_idx
  on public.marketing_events (standard_event, created_at desc);

create index if not exists user_funnel_progress_user_idx
  on public.user_funnel_progress (user_id, email, anonymous_id);

create index if not exists whatsapp_message_logs_order_idx
  on public.whatsapp_message_logs (order_id, created_at desc);

alter table public.marketing_events enable row level security;
alter table public.user_funnel_progress enable row level security;
alter table public.whatsapp_message_logs enable row level security;

drop policy if exists "marketing_events_select_own" on public.marketing_events;
create policy "marketing_events_select_own"
  on public.marketing_events
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "marketing_events_insert_own" on public.marketing_events;
create policy "marketing_events_insert_own"
  on public.marketing_events
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or user_id is null
  );

drop policy if exists "user_funnel_progress_select_own" on public.user_funnel_progress;
create policy "user_funnel_progress_select_own"
  on public.user_funnel_progress
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
