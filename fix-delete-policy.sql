-- ============================================
-- CORRIGIR POLÍTICA DE EXCLUSÃO DE PEDIDOS
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Verificar políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'pedidos';

-- 2. Remover políticas antigas de delete (se existirem)
DROP POLICY IF EXISTS "Allow admin delete pedidos" ON pedidos;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON pedidos;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON pedidos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON pedidos;

-- 3. Criar nova política permitindo delete para usuários autenticados
CREATE POLICY "Enable delete for authenticated users" 
ON pedidos
FOR DELETE
TO authenticated
USING (true);

-- 4. Também permitir para anon (se necessário para testes)
-- CREATE POLICY "Enable delete for anon users" 
-- ON pedidos
-- FOR DELETE
-- TO anon
-- USING (true);

-- 5. Verificar se a política foi criada
SELECT * FROM pg_policies WHERE tablename = 'pedidos';
