-- ============================================
-- ADICIONAR COLUNA ENDEREÇO NA TABELA PEDIDOS
-- Execute no SQL Editor do Supabase
-- ============================================

-- Adicionar coluna endereco do tipo JSONB
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS endereco JSONB;

-- Verificar se a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pedidos';
