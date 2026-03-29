-- ============================================
-- NEW SYSTEM DISTRIBUIDORA - DATABASE SCHEMA (PORTUGUÊS)
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: CATEGORIAS
-- ============================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categorias_slug ON categorias(slug);
CREATE INDEX idx_categorias_active ON categorias(is_active);

-- ============================================
-- TABELA: PRODUTOS
-- ============================================
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  descricao TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  
  -- Preços
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_caixa DECIMAL(10,2),
  preco_promocional_unitario DECIMAL(10,2),
  preco_promocional_caixa DECIMAL(10,2),
  
  -- Informações da caixa
  quantidade_por_caixa INTEGER,
  peso_caixa DECIMAL(8,2),
  dimensoes_caixa JSONB,
  
  -- Estoque
  estoque_unitario INTEGER DEFAULT 0,
  estoque_caixa INTEGER DEFAULT 0,
  
  -- Imagens e mídia
  imagem_principal TEXT NOT NULL,
  galeria_imagens TEXT[],
  video_url TEXT,
  
  -- Selos e destaques
  is_novo BOOLEAN DEFAULT false,
  is_promocao BOOLEAN DEFAULT false,
  is_mais_vendido BOOLEAN DEFAULT false,
  is_destaque BOOLEAN DEFAULT false,
  
  -- Tipo de catálogo
  tipo_catalogo VARCHAR(20) CHECK (tipo_catalogo IN ('UNITARIO', 'CAIXA_FECHADA', 'AMBOS')),
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  visualizacoes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_produtos_slug ON produtos(slug);
CREATE INDEX idx_produtos_sku ON produtos(sku);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_tipo_catalogo ON produtos(tipo_catalogo);
CREATE INDEX idx_produtos_active ON produtos(is_active);
CREATE INDEX idx_produtos_novo ON produtos(is_novo);
CREATE INDEX idx_produtos_promocao ON produtos(is_promocao);
CREATE INDEX idx_produtos_mais_vendido ON produtos(is_mais_vendido);
CREATE INDEX idx_produtos_destaque ON produtos(is_destaque);

-- ============================================
-- TABELA: PEDIDOS
-- ============================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_pedido VARCHAR(50) UNIQUE NOT NULL,
  
  -- Informações do cliente
  cliente_nome VARCHAR(255),
  cliente_telefone VARCHAR(20),
  cliente_email VARCHAR(255),
  
  -- Tipo de pedido
  tipo_catalogo VARCHAR(20) NOT NULL CHECK (tipo_catalogo IN ('UNITARIO', 'CAIXA_FECHADA')),
  
  -- Valores
  subtotal DECIMAL(10,2) NOT NULL,
  desconto_valor DECIMAL(10,2) DEFAULT 0,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Itens
  itens JSONB NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  -- WhatsApp
  whatsapp_enviado BOOLEAN DEFAULT false,
  mensagem_whatsapp TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_tipo_catalogo ON pedidos(tipo_catalogo);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at);

-- ============================================
-- TABELA: VISUALIZACOES_DO_PRODUTO
-- ============================================
CREATE TABLE IF NOT EXISTS visualizacoes_do_produto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  visualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Índices
CREATE INDEX idx_visualizacoes_produto ON visualizacoes_do_produto(produto_id);
CREATE INDEX idx_visualizacoes_data ON visualizacoes_do_produto(visualizado_em);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para produtos
DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número do pedido
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');
  
  -- Contar pedidos do ano atual
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM pedidos
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  order_num := 'NS' || year || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE visualizacoes_do_produto ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Allow public read categorias" ON categorias
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write categorias" ON categorias
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para produtos
CREATE POLICY "Allow public read produtos" ON produtos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow admin write produtos" ON produtos
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para pedidos
CREATE POLICY "Allow public create pedidos" ON pedidos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin read pedidos" ON pedidos
  FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para visualizacoes_do_produto
CREATE POLICY "Allow public create views" ON visualizacoes_do_produto
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin read views" ON visualizacoes_do_produto
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir categorias padrão
INSERT INTO categorias (nome, slug, order_index) VALUES
  ('Novo', 'novo', 1),
  ('Caixa de Som', 'caixa-de-som', 2),
  ('Rádio', 'radio', 3),
  ('Fone de Ouvido', 'fone-de-ouvido', 4),
  ('Kit de Ferramentas', 'kit-de-ferramentas', 5),
  ('Microfone', 'microfone', 6),
  ('Suporte', 'suporte', 7),
  ('Carregador', 'carregador', 8),
  ('Cabo de Celular', 'cabo-de-celular', 9),
  ('Umidificador', 'umidificador', 10),
  ('Memória e Pendrive', 'memoria-e-pendrive', 11),
  ('Fan', 'fan', 12),
  ('Iluminação', 'iluminacao', 13),
  ('Cortador de Cabelo', 'cortador-de-cabelo', 14),
  ('Controle Remoto', 'controle-remoto', 15),
  ('Mercearias', 'mercearias', 16),
  ('Outros', 'outros', 17)
ON CONFLICT (slug) DO NOTHING;
