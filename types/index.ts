export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku: string;
  category_id: string;
  category?: Category;
  
  // Preços
  price_unit: number;
  price_box?: number;
  promotional_price_unit?: number;
  promotional_price_box?: number;
  
  // Informações da caixa
  quantity_per_box?: number;
  box_weight?: number;
  box_dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  
  // Estoque
  stock_unit: number;
  stock_box: number;
  
  // Imagens e mídia
  main_image: string;
  gallery_images?: string[];
  video_url?: string;
  
  // Selos e destaques
  is_new: boolean;
  is_promotion: boolean;
  is_bestseller: boolean;
  is_featured: boolean;
  
  // Tipo de catálogo
  catalog_type: 'UNITARIO' | 'CAIXA_FECHADA' | 'AMBOS';
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  
  // Controle
  is_active: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  type: 'UNITARIO' | 'CAIXA_FECHADA';
}

export interface Cart {
  items: CartItem[];
  catalogType: 'UNITARIO' | 'CAIXA_FECHADA' | null;
  subtotal: number;
  discount: number;
  total: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  type: 'UNITARIO' | 'CAIXA_FECHADA';
}

export interface Order {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  catalog_type: 'UNITARIO' | 'CAIXA_FECHADA';
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  total: number;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'cancelled';
  whatsapp_sent: boolean;
  whatsapp_message?: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface ProductView {
  id: string;
  product_id: string;
  viewed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface FilterOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isPromotion?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  catalogType?: 'UNITARIO' | 'CAIXA_FECHADA';
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
}

export interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  mostViewedProducts: Product[];
  bestSellingProducts: Product[];
}