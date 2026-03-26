export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          descricao: string | null;
          imagem_url: string | null;
          order_index: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          descricao?: string | null;
          imagem_url?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          slug?: string;
          descricao?: string | null;
          imagem_url?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      produtos: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          descricao: string | null;
          sku: string;
          categoria_id: string | null;
          preco_unitario: number;
          preco_caixa: number | null;
          preco_promocional_unitario: number | null;
          preco_promocional_caixa: number | null;
          quantidade_por_caixa: number | null;
          peso_caixa: number | null;
          dimensoes_caixa: Json | null;
          estoque_unitario: number;
          estoque_caixa: number;
          imagem_principal: string;
          galeria_imagens: string[] | null;
          video_url: string | null;
          is_novo: boolean;
          is_promocao: boolean;
          is_mais_vendido: boolean;
          is_destaque: boolean;
          tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA';
          meta_title: string | null;
          meta_description: string | null;
          is_active: boolean;
          visualizacoes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          descricao?: string | null;
          sku: string;
          categoria_id?: string | null;
          preco_unitario: number;
          preco_caixa?: number | null;
          preco_promocional_unitario?: number | null;
          preco_promocional_caixa?: number | null;
          quantidade_por_caixa?: number | null;
          peso_caixa?: number | null;
          dimensoes_caixa?: Json | null;
          estoque_unitario?: number;
          estoque_caixa?: number;
          imagem_principal: string;
          galeria_imagens?: string[] | null;
          video_url?: string | null;
          is_novo?: boolean;
          is_promocao?: boolean;
          is_mais_vendido?: boolean;
          is_destaque?: boolean;
          tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA';
          meta_title?: string | null;
          meta_description?: string | null;
          is_active?: boolean;
          visualizacoes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          slug?: string;
          descricao?: string | null;
          sku?: string;
          categoria_id?: string | null;
          preco_unitario?: number;
          preco_caixa?: number | null;
          preco_promocional_unitario?: number | null;
          preco_promocional_caixa?: number | null;
          quantidade_por_caixa?: number | null;
          peso_caixa?: number | null;
          dimensoes_caixa?: Json | null;
          estoque_unitario?: number;
          estoque_caixa?: number;
          imagem_principal?: string;
          galeria_imagens?: string[] | null;
          video_url?: string | null;
          is_novo?: boolean;
          is_promocao?: boolean;
          is_mais_vendido?: boolean;
          is_destaque?: boolean;
          tipo_catalogo?: 'UNITARIO' | 'CAIXA_FECHADA';
          meta_title?: string | null;
          meta_description?: string | null;
          is_active?: boolean;
          visualizacoes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      pedidos: {
        Row: {
          id: string;
          numero_pedido: string;
          cliente_nome: string | null;
          cliente_telefone: string | null;
          cliente_email: string | null;
          tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA';
          subtotal: number;
          desconto_valor: number;
          desconto_percentual: number;
          total: number;
          itens: Json;
          status: 'pending' | 'confirmed' | 'cancelled';
          whatsapp_enviado: boolean;
          mensagem_whatsapp: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          numero_pedido: string;
          cliente_nome?: string | null;
          cliente_telefone?: string | null;
          cliente_email?: string | null;
          tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA';
          subtotal: number;
          desconto_valor?: number;
          desconto_percentual?: number;
          total: number;
          itens: Json;
          status?: 'pending' | 'confirmed' | 'cancelled';
          whatsapp_enviado?: boolean;
          mensagem_whatsapp?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          numero_pedido?: string;
          cliente_nome?: string | null;
          cliente_telefone?: string | null;
          cliente_email?: string | null;
          tipo_catalogo?: 'UNITARIO' | 'CAIXA_FECHADA';
          subtotal?: number;
          desconto_valor?: number;
          desconto_percentual?: number;
          total?: number;
          itens?: Json;
          status?: 'pending' | 'confirmed' | 'cancelled';
          whatsapp_enviado?: boolean;
          mensagem_whatsapp?: string | null;
          created_at?: string;
        };
      };
      visualizacoes_do_produto: {
        Row: {
          id: string;
          produto_id: string;
          visualizado_em: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          produto_id: string;
          visualizado_em?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          produto_id?: string;
          visualizado_em?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
