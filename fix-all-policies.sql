-- ============================================
-- POLÍTICAS DE STORAGE (com IF NOT EXISTS)
-- ============================================

-- PERMITIR LEITURA PÚBLICA
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
create policy "Public read images"
on storage.objects
for select
to public
using (bucket_id = 'images');

-- PERMITIR UPLOAD
DROP POLICY IF EXISTS "Public upload images" ON storage.objects;
create policy "Public upload images"
on storage.objects
for insert
to public
with check (bucket_id = 'images');

-- PERMITIR UPDATE
DROP POLICY IF EXISTS "Public update images" ON storage.objects;
create policy "Public update images"
on storage.objects
for update
to public
using (bucket_id = 'images')
with check (bucket_id = 'images');

-- PERMITIR DELETE
DROP POLICY IF EXISTS "Public delete images" ON storage.objects;
create policy "Public delete images"
on storage.objects
for delete
to public
using (bucket_id = 'images');

-- ============================================
-- POLÍTICA DE EXCLUSÃO DE PEDIDOS (NOVO)
-- ============================================

-- Remover políticas antigas de delete (se existirem)
DROP POLICY IF EXISTS "Allow admin delete pedidos" ON pedidos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON pedidos;

-- Criar política permitindo delete para usuários autenticados
CREATE POLICY "Enable delete for authenticated users" 
ON pedidos
FOR DELETE
TO authenticated
USING (true);
