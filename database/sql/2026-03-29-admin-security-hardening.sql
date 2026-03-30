create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'manager'),
    false
  )
  or coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'user_role') in ('admin', 'manager'),
    false
  );
$$;

grant execute on function public.is_admin_user() to anon, authenticated, service_role;

alter table if exists public.categorias enable row level security;
alter table if exists public.produtos enable row level security;
alter table if exists public.pedidos enable row level security;
alter table if exists public.visualizacoes_do_produto enable row level security;
alter table if exists public.clientes enable row level security;

drop policy if exists "Allow public read categorias" on public.categorias;
drop policy if exists "Allow admin write categorias" on public.categorias;
drop policy if exists "Public read categorias" on public.categorias;
drop policy if exists "Admin manage categorias" on public.categorias;

create policy "Public read categorias"
on public.categorias
for select
to public
using (true);

create policy "Admin manage categorias"
on public.categorias
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Allow public read produtos" on public.produtos;
drop policy if exists "Allow admin write produtos" on public.produtos;
drop policy if exists "Public read produtos" on public.produtos;
drop policy if exists "Admin manage produtos" on public.produtos;

create policy "Public read produtos"
on public.produtos
for select
to public
using (is_active = true or public.is_admin_user());

create policy "Admin manage produtos"
on public.produtos
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Allow public create pedidos" on public.pedidos;
drop policy if exists "Allow admin read pedidos" on public.pedidos;
drop policy if exists "Enable delete for authenticated users" on public.pedidos;
drop policy if exists "Public create pedidos" on public.pedidos;
drop policy if exists "Admin read pedidos" on public.pedidos;
drop policy if exists "Admin update pedidos" on public.pedidos;
drop policy if exists "Admin delete pedidos" on public.pedidos;
drop policy if exists "Owner read pedidos" on public.pedidos;

create policy "Public create pedidos"
on public.pedidos
for insert
to public
with check (true);

create policy "Owner read pedidos"
on public.pedidos
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(cliente_email, ''))
);

create policy "Admin read pedidos"
on public.pedidos
for select
to authenticated
using (public.is_admin_user());

create policy "Admin update pedidos"
on public.pedidos
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "Admin delete pedidos"
on public.pedidos
for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "Allow public create views" on public.visualizacoes_do_produto;
drop policy if exists "Allow admin read views" on public.visualizacoes_do_produto;
drop policy if exists "Public create views" on public.visualizacoes_do_produto;
drop policy if exists "Admin read views" on public.visualizacoes_do_produto;

create policy "Public create views"
on public.visualizacoes_do_produto
for insert
to public
with check (true);

create policy "Admin read views"
on public.visualizacoes_do_produto
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "Allow service role on clientes" on public.clientes;
drop policy if exists "Own read clientes" on public.clientes;
drop policy if exists "Own insert clientes" on public.clientes;
drop policy if exists "Own update clientes" on public.clientes;
drop policy if exists "Admin read clientes" on public.clientes;

create policy "Own read clientes"
on public.clientes
for select
to authenticated
using (auth.uid() = id or public.is_admin_user());

create policy "Own insert clientes"
on public.clientes
for insert
to authenticated
with check (auth.uid() = id or public.is_admin_user());

create policy "Own update clientes"
on public.clientes
for update
to authenticated
using (auth.uid() = id or public.is_admin_user())
with check (auth.uid() = id or public.is_admin_user());

drop policy if exists "Public read images" on storage.objects;
drop policy if exists "Public upload images" on storage.objects;
drop policy if exists "Public update images" on storage.objects;
drop policy if exists "Public delete images" on storage.objects;
drop policy if exists "Admin upload images" on storage.objects;
drop policy if exists "Admin update images" on storage.objects;
drop policy if exists "Admin delete images" on storage.objects;

create policy "Public read images"
on storage.objects
for select
to public
using (bucket_id = 'images');

create policy "Admin upload images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'images' and public.is_admin_user());

create policy "Admin update images"
on storage.objects
for update
to authenticated
using (bucket_id = 'images' and public.is_admin_user())
with check (bucket_id = 'images' and public.is_admin_user());

create policy "Admin delete images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'images' and public.is_admin_user());
