-- Cria a tabela 'clientes' para armazenar usuários cadastrados na plataforma
-- Essa tabela complementa o Supabase Auth, pois o auth armazena apenas email
-- e senha. Aqui podemos salvar CPF/CNPJ, telefone e endereço do cliente.

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  telefone VARCHAR(20),
  endereco JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Adiciona coluna de CPF/CNPJ aos pedidos, caso ainda não exista
ALTER TABLE IF EXISTS pedidos ADD COLUMN IF NOT EXISTS cliente_cpf_cnpj VARCHAR(20);

-- Habilitar RLS na tabela de clientes e permitir operações apenas via service role
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role on clientes" ON clientes
  FOR ALL USING (auth.role() = 'service_role');