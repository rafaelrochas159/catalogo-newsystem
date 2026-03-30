export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  imagem_url?: string;
  ordem?: number;
  order_index: number;
  is_active: boolean;
  created_at: string;

  // aliases em inglês
  name?: string;
  description?: string;
  image_url?: string;
}

export interface Produto {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  sku: string;
  categoria_id: string;
  categoria?: Categoria;

  // Preços
  preco_unitario: number;
  preco_caixa?: number;
  preco_promocional_unitario?: number;
  preco_promocional_caixa?: number;

  // Informações da caixa
  quantidade_por_caixa?: number;
  peso_caixa?: number;
  dimensoes_caixa?: {
    comprimento: number;
    largura: number;
    altura: number;
    length?: number;
    width?: number;
    height?: number;
  };

  // Estoque
  estoque_unitario: number;
  estoque_caixa: number;

  // Imagens e mídia
  imagem_principal: string;
  galeria_imagens?: string[];
  video_url?: string;

  // Selos e destaques
  is_novo: boolean;
  is_promocao: boolean;
  is_mais_vendido: boolean;
  is_destaque: boolean;
  destaque_home?: boolean;
  related_product_ids?: string[];

  // Tipo de catálogo
  tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA' | 'AMBOS';

  // SEO
  meta_title?: string;
  meta_description?: string;

  // Controle
  is_active: boolean;
  visualizacoes: number;
  created_at: string;
  updated_at: string;

  // aliases em inglês
  name?: string;
  description?: string;
  category_id?: string;
  category?: Categoria;
  price_unit?: number;
  price_box?: number;
  promotional_price_unit?: number;
  promotional_price_box?: number;
  quantity_per_box?: number;
  box_weight?: number;
  box_dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  stock_unit?: number;
  stock_box?: number;
  main_image?: string;
  gallery_images?: string[];
  is_new?: boolean;
  is_promotion?: boolean;
  is_bestseller?: boolean;
  is_featured?: boolean;
  home_featured?: boolean;
  related_products?: string[];
  catalog_type?: 'UNITARIO' | 'CAIXA_FECHADA' | 'AMBOS';
  views?: number;
}

export interface ItemCarrinho {
  // formato usado no carrinho atual
  id?: string;
  productId: string;
  name: string;
  sku: string;
  image: string;
  price: number;
  quantity: number;
  type: 'unit' | 'box' | 'UNITARIO' | 'CAIXA_FECHADA';
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA';

  // formato alternativo
  product?: Produto;
}

export interface Carrinho {
  items: ItemCarrinho[];
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA' | null;
  subtotal: number;
  discount: number;
  total: number;
}

export interface ItemPedido {
  product_id?: string;
  product_name?: string;
  sku: string;
  image?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  type?: 'UNITARIO' | 'CAIXA_FECHADA';

  // campos em português usados no projeto
  produto_id?: string;
  nome?: string;
  quantidade?: number;
  preco_unitario?: number;
  preco_total?: number;
  tipo?: 'UNITARIO' | 'CAIXA_FECHADA';
}

export interface Pedido {
  id: string;
  numero_pedido: string;
  nome_cliente?: string;
  telefone_cliente?: string;
  email_cliente?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  tipo_catalogo: 'UNITARIO' | 'CAIXA_FECHADA';
  subtotal: number;
  valor_desconto: number;
  desconto_valor?: number;
  percentual_desconto: number;
  total: number;
  itens: ItemPedido[];
  endereco?: {
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    complemento?: string;
  } | null;
  checkout_token?: string | null;
  user_id?: string | null;
  original_total?: number | null;
  coupon_code?: string | null;
  coupon_discount_type?: string | null;
  coupon_discount_value?: number | null;
  abandoned_cart_id?: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | string;
  status_pedido?: string | null;
  status_pagamento?: string | null;
  forma_pagamento?: string | null;
  gateway?: string | null;
  payment_id_gateway?: string | null;
  external_reference?: string | null;
  pix_qr_code?: string | null;
  pix_copia_cola?: string | null;
  payment_gateway_response?: unknown;
  status_gateway_detalhe?: string | null;
  paid_at?: string | null;
  enviado_whatsapp?: boolean;
  whatsapp_enviado?: boolean;
  mensagem_whatsapp?: string | null;
  created_at: string;
  updated_at?: string | null;

  // aliases em inglês
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  catalog_type?: 'UNITARIO' | 'CAIXA_FECHADA';
  discount_amount?: number;
  discount_percentage?: number;
  items?: ItemPedido[];
  whatsapp_sent?: boolean;
  whatsapp_message?: string;

  /** CPF ou CNPJ do cliente, quando informado no checkout */
  cliente_cpf_cnpj?: string | null;
}

/**
 * Tipo para representar um cliente cadastrado no sistema.
 * Os clientes são registrados na tabela 'clientes'.
 */
export interface Cliente {
  id: string;
  nome: string;
  email: string;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  endereco?: {
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    complemento?: string;
  } | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface FavoriteProduct {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  produto?: Produto;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: 'FIRST_PURCHASE' | 'RECURRENT' | 'ABANDONED_CART' | 'MIN_TICKET' | 'GLOBAL';
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  minimum_order_value?: number | null;
  max_discount_value?: number | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  per_user_limit?: number | null;
  product_ids?: string[] | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface AbandonedCart {
  id: string;
  user_id?: string | null;
  email?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  cart_items: unknown[];
  cart_type?: string | null;
  item_count: number;
  subtotal: number;
  total: number;
  status: 'active' | 'abandoned' | 'recovered' | 'converted';
  created_at: string;
  updated_at?: string | null;
  abandoned_at?: string | null;
  recovered_at?: string | null;
  converted_at?: string | null;
}

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome?: string;
  role: 'admin' | 'manager';
  is_active: boolean;
  last_login?: string;
  created_at: string;

  // alias
  name?: string;
}

export interface VisualizacaoProduto {
  id: string;
  product_id: string;
  viewed_at: string;
  ip_address?: string;
  user_agent?: string;

  // aliases
  produto_id?: string;
  visualizado_em?: string;
}

export interface FiltrosProduto {
  categoria?: string;
  precoMin?: number;
  precoMax?: number;
  isPromotion?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  tipoCatalogo?: 'UNITARIO' | 'CAIXA_FECHADA';

  // aliases em inglês
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA';
}

export interface ResultadoBusca {
  products: Produto[];
  total: number;
  page: number;
  perPage: number;
}

export interface Estatisticas {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  mostViewedProducts: Produto[];
  bestSellingProducts: Produto[];
}

// aliases em inglês para compatibilidade
export type Category = Categoria;
export type Product = Produto;
export type CartItem = ItemCarrinho;
export type Cart = Carrinho;
export type OrderItem = ItemPedido;
export type Order = Pedido;
export type AdminUser = UsuarioAdmin;
export type ProductView = VisualizacaoProduto;
export type FilterOptions = FiltrosProduto;
export type SearchResult = ResultadoBusca;
export type Stats = Estatisticas;
