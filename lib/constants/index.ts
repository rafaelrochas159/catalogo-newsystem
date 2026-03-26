export const COMPANY_INFO = {
  name: 'NEW SYSTEM DISTRIBUIDORA',
  cnpj: '51.011.750/0001-08',
  since: 2016,
  whatsapp: '5511982691629',
  instagram: 'https://www.instagram.com/_neewsystem/',
  email: 'newsystem709@gmail.com',
  address: 'São Paulo - SP',
};

export const BUSINESS_RULES = {
  minOrderValue: 200, // R$200 para pedidos unitários
  discountThreshold: 1000, // R$1000 para desconto
  discountPercentage: 10, // 10% de desconto
  sameDayDelivery: true, // Entrega no mesmo dia em SP
};

export const CATEGORIES = [
  { name: 'Novo', slug: 'novo', order: 1 },
  { name: 'Caixa de Som', slug: 'caixa-de-som', order: 2 },
  { name: 'Rádio', slug: 'radio', order: 3 },
  { name: 'Fone de Ouvido', slug: 'fone-de-ouvido', order: 4 },
  { name: 'Kit de Ferramentas', slug: 'kit-de-ferramentas', order: 5 },
  { name: 'Microfone', slug: 'microfone', order: 6 },
  { name: 'Suporte', slug: 'suporte', order: 7 },
  { name: 'Carregador', slug: 'carregador', order: 8 },
  { name: 'Cabo de Celular', slug: 'cabo-de-celular', order: 9 },
  { name: 'Umidificador', slug: 'umidificador', order: 10 },
  { name: 'Memória e Pendrive', slug: 'memoria-e-pendrive', order: 11 },
  { name: 'Fan', slug: 'fan', order: 12 },
  { name: 'Iluminação', slug: 'iluminacao', order: 13 },
  { name: 'Cortador de Cabelo', slug: 'cortador-de-cabelo', order: 14 },
  { name: 'Controle Remoto', slug: 'controle-remoto', order: 15 },
  { name: 'Mercearias', slug: 'mercearias', order: 16 },
  { name: 'Outros', slug: 'outros', order: 17 },
] as const;

export const CATALOG_TYPES = {
  UNITARIO: 'UNITARIO',
  CAIXA_FECHADA: 'CAIXA_FECHADA',

} as const;

export const PRODUCT_BADGES = {
  NEW: { label: 'Novo', color: 'bg-green-500' },
  PROMOTION: { label: 'Promoção', color: 'bg-red-500' },
  BESTSELLER: { label: 'Mais Vendido', color: 'bg-yellow-500' },
  FEATURED: { label: 'Destaque', color: 'bg-purple-500' },
  BOX: { label: 'Caixa Fechada', color: 'bg-blue-500' },
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;

export const META_DEFAULTS = {
  title: 'NEW SYSTEM DISTRIBUIDORA | Acessórios para Celular',
  description: 'Desde 2016 no mercado de acessórios para celular. Qualidade, preço competitivo e atendimento rápido. Pedido mínimo R$200. Entrega em São Paulo no mesmo dia.',
  keywords: 'acessórios celular, distribuidora, caixa de som, fone de ouvido, carregador, cabo, suporte, São Paulo',
  ogImage: '/images/og-image.jpg',
  twitterHandle: '@newsystem',
};

export const PAGINATION = {
  defaultPerPage: 24,
  options: [12, 24, 48, 96],
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const ANIMATION_CONFIG = {
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
  },
  ease: {
    default: [0.4, 0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
    smooth: [0.25, 0.1, 0.25, 1],
  },
};

export const STORAGE_KEYS = {
  cart: 'newsystem_cart',
  favorites: 'newsystem_favorites',
  recentlyViewed: 'newsystem_recently_viewed',
  adminToken: 'newsystem_admin_token',
};

export const API_ROUTES = {
  products: '/api/produtos',
  categories: '/api/categorias',
  orders: '/api/pedidos',
  auth: '/api/auth',
  import: '/api/importar',
};

export const ADMIN_ROUTES = {
  dashboard: '/admin/dashboard',
  products: '/admin/produtos',
  categories: '/admin/categorias',
  orders: '/admin/pedidos',
  import: '/admin/importar',
};

export const SITE_ROUTES = {
  home: '/',
  catalogUnitario: '/catalogo/unitario',
  catalogCaixaFechada: '/catalogo/caixa-fechada',
  category: (slug: string) => `/categoria/${slug}`,
  product: (slug: string) => `/produto/${slug}`,
  search: '/busca',
  contact: '/contato',
};