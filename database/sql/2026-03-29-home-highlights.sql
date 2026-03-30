alter table if exists public.produtos
  add column if not exists destaque_home boolean default false;

create index if not exists produtos_destaque_home_idx
  on public.produtos (destaque_home)
  where destaque_home = true;
