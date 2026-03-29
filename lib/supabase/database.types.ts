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
          tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA' | 'AMBOS';
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
          tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA' | 'AMBOS';
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
          tipo_catalogo?: 'UNITARIO' | 'CAIXA_FECHADA' | 'AMBOS';
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
          endereco: Json | null;
          checkout_token: string | null;
          status: string;
          status_pedido: string | null;
          status_pagamento: string | null;
          forma_pagamento: string | null;
          gateway: string | null;
          payment_id_gateway: string | null;
          external_reference: string | null;
          pix_qr_code: string | null;
          pix_copia_cola: string | null;
          whatsapp_enviado: boolean;
          mensagem_whatsapp: string | null;
          payment_gateway_response: Json | null;
          status_gateway_detalhe: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string | null;
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
          endereco?: Json | null;
          checkout_token?: string | null;
          status?: string;
          status_pedido?: string | null;
          status_pagamento?: string | null;
          forma_pagamento?: string | null;
          gateway?: string | null;
          payment_id_gateway?: string | null;
          external_reference?: string | null;
          pix_qr_code?: string | null;
          pix_copia_cola?: string | null;
          whatsapp_enviado?: boolean;
          mensagem_whatsapp?: string | null;
          payment_gateway_response?: Json | null;
          status_gateway_detalhe?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
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
          endereco?: Json | null;
          checkout_token?: string | null;
          status?: string;
          status_pedido?: string | null;
          status_pagamento?: string | null;
          forma_pagamento?: string | null;
          gateway?: string | null;
          payment_id_gateway?: string | null;
          external_reference?: string | null;
          pix_qr_code?: string | null;
          pix_copia_cola?: string | null;
          whatsapp_enviado?: boolean;
          mensagem_whatsapp?: string | null;
          payment_gateway_response?: Json | null;
          status_gateway_detalhe?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      pagamentos: {
        Row: {
          id: string;
          pedido_id: string | null;
          numero_pedido: string;
          gateway: string;
          forma_pagamento: string;
          payment_id_gateway: string;
          external_reference: string;
          qr_code: string | null;
          pix_copia_cola: string | null;
          status_pagamento: string;
          valor: number;
          payload_gateway: Json | null;
          created_at: string;
          updated_at: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          pedido_id?: string | null;
          numero_pedido: string;
          gateway: string;
          forma_pagamento: string;
          payment_id_gateway: string;
          external_reference: string;
          qr_code?: string | null;
          pix_copia_cola?: string | null;
          status_pagamento: string;
          valor: number;
          payload_gateway?: Json | null;
          created_at?: string;
          updated_at?: string | null;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          pedido_id?: string | null;
          numero_pedido?: string;
          gateway?: string;
          forma_pagamento?: string;
          payment_id_gateway?: string;
          external_reference?: string;
          qr_code?: string | null;
          pix_copia_cola?: string | null;
          status_pagamento?: string;
          valor?: number;
          payload_gateway?: Json | null;
          created_at?: string;
          updated_at?: string | null;
          paid_at?: string | null;
        };
      };
      compradores_acesso: {
        Row: {
          id: string;
          email: string;
          nome: string | null;
          telefone: string | null;
          acesso_liberado: boolean;
          ultimo_numero_pedido: string | null;
          liberado_em: string | null;
          created_at: string;
          atualizado_em: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          nome?: string | null;
          telefone?: string | null;
          acesso_liberado?: boolean;
          ultimo_numero_pedido?: string | null;
          liberado_em?: string | null;
          created_at?: string;
          atualizado_em?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          nome?: string | null;
          telefone?: string | null;
          acesso_liberado?: boolean;
          ultimo_numero_pedido?: string | null;
          liberado_em?: string | null;
          created_at?: string;
          atualizado_em?: string | null;
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
