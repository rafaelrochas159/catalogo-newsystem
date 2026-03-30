import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null | undefined): string {
  const safePrice = price ?? 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safePrice);
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('pt-BR').format(number);
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function generateSlug(name: string, sku?: string): string {
  const baseSlug = slugify(name);
  return sku ? `${baseSlug}-${sku.toLowerCase()}` : `${baseSlug}-${Date.now()}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function calculateDiscount(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100);
}

export function calculateInstallment(price: number, installments: number = 12): {
  installmentPrice: number;
  totalPrice: number;
} {
  const interestRate = 0.0199; // 1.99% ao mês
  const installmentPrice = price * (interestRate * Math.pow(1 + interestRate, installments)) / 
    (Math.pow(1 + interestRate, installments) - 1);
  
  return {
    installmentPrice: Math.ceil(installmentPrice * 100) / 100,
    totalPrice: Math.ceil(installmentPrice * installments * 100) / 100,
  };
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function unmaskPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let weight = 2;
  
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleaned.charAt(12)) !== firstDigit) return false;
  
  sum = 0;
  weight = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cleaned.charAt(13)) === secondDigit;
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function getWhatsAppLink(phone: string, message?: string): string {
  let cleanedPhone = phone.replace(/\D/g, '');

  if (cleanedPhone.length === 10 || cleanedPhone.length === 11) {
    cleanedPhone = `55${cleanedPhone}`;
  }

  const encodedMessage = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${cleanedPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
}

interface OrderMessageItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface AddressData {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

interface CustomerData {
  nome?: string;
  telefone?: string;
  email?: string;
  /** CPF ou CNPJ do cliente. Opcional para controlar fiscalmente e identificar o cliente */
  cpf_cnpj?: string | null;
}

interface CatalogPricingProduct {
  preco_unitario?: number | null;
  preco_caixa?: number | null;
  quantidade_por_caixa?: number | null;
}

export function getBoxUnitPrice(product: CatalogPricingProduct): number | null {
  if (!product.preco_caixa || !product.quantidade_por_caixa || product.quantidade_por_caixa <= 0) {
    return null;
  }

  return product.preco_caixa / product.quantidade_por_caixa;
}

export function getBoxSavings(product: CatalogPricingProduct): {
  unitPriceInBox: number | null;
  savingsPerUnit: number;
  savingsPercent: number;
} {
  const unitPriceInBox = getBoxUnitPrice(product);
  const unitPrice = product.preco_unitario || 0;

  if (!unitPriceInBox || !unitPrice || unitPriceInBox >= unitPrice) {
    return {
      unitPriceInBox,
      savingsPerUnit: 0,
      savingsPercent: 0,
    };
  }

  const savingsPerUnit = unitPrice - unitPriceInBox;
  const savingsPercent = (savingsPerUnit / unitPrice) * 100;

  return {
    unitPriceInBox,
    savingsPerUnit,
    savingsPercent,
  };
}

export function generateOrderMessage(order: {
  orderNumber: string;
  catalogType: string;
  items: OrderMessageItem[];
  subtotal: number;
  discount: number;
  total: number;
  address?: AddressData;
  customer?: CustomerData;
  paymentMethod?: string;
}): string {
  const typeLabel = order.catalogType === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada';

  let message = `🛒 *NOVO PEDIDO - NEW SYSTEM*
`;
  message += `📋 Pedido: ${order.orderNumber}
`;
  message += `📦 Tipo: ${typeLabel}
`;
  if (order.paymentMethod) {
    message += `💳 Pagamento: ${order.paymentMethod}
`;
  }
  message += `
`;

  if (order.customer?.nome || order.customer?.telefone || order.customer?.email) {
    message += `*CLIENTE:*
`;
    if (order.customer.nome) message += `👤 ${order.customer.nome}
`;
    if (order.customer.telefone) message += `📞 ${order.customer.telefone}
`;
    if (order.customer.email) message += `✉️ ${order.customer.email}
`;
    message += `
`;
  }

  message += `*ITENS:*
`;
  order.items.forEach((item, index) => {
    message += `${index + 1}. ${item.name}
`;
    message += `   SKU: ${item.sku}
`;
    message += `   Qtd: ${item.quantity}x
`;
    message += `   Unit: ${formatPrice(item.unitPrice)}
`;
    message += `   Total: ${formatPrice(item.totalPrice)}

`;
  });

  message += `*RESUMO:*
`;
  message += `Subtotal: ${formatPrice(order.subtotal)}
`;
  if (order.discount > 0) {
    message += `Desconto: -${formatPrice(order.discount)}
`;
  }
  message += `*TOTAL: ${formatPrice(order.total)}*

`;

  if (order.address) {
    message += `*ENDEREÇO DE ENTREGA:*
`;
    message += `📮 CEP: ${order.address.cep}
`;
    message += `📍 ${order.address.rua}, ${order.address.numero}
`;
    message += `🏘️ ${order.address.bairro}
`;
    message += `🌆 ${order.address.cidade} - ${order.address.estado}
`;
    if (order.address.complemento) {
      message += `📝 ${order.address.complemento}
`;
    }
    message += `
`;
  }

  message += `Aguardo confirmação! ✅`;

  return message;
}

export function generateProfessionalOrderMessage(order: {
  orderNumber: string;
  catalogType: string;
  items: OrderMessageItem[];
  subtotal: number;
  discount: number;
  total: number;
  address?: AddressData;
  customer?: CustomerData;
  paymentMethod?: string;
}): string {
  const typeLabel = order.catalogType === 'CAIXA_FECHADA' ? 'Caixa fechada' : 'Unitario';
  const paymentLabel = order.paymentMethod || 'Pagamento confirmado';
  const lines: string[] = [
    '🛒 *NOVO PEDIDO - NEW SYSTEM*',
    `📋 Pedido: ${order.orderNumber}`,
    `📦 Tipo: ${typeLabel}`,
    `💳 Pagamento: ${paymentLabel}`,
    '',
    '*CLIENTE*',
    `👤 ${order.customer?.nome || 'Nao informado'}`,
    `📞 ${order.customer?.telefone || 'Nao informado'}`,
    `✉️ ${order.customer?.email || 'Nao informado'}`,
    '',
    '*ITENS*',
  ];

  order.items.forEach((item) => {
    lines.push(`* ${item.name} | SKU: ${item.sku || '-'}`);
    lines.push(`  Qtd: ${item.quantity}`);
    lines.push(`  Unit: ${formatPrice(item.unitPrice)}`);
    lines.push(`  Total: ${formatPrice(item.totalPrice)}`);
    lines.push('');
  });

  lines.push('*RESUMO*');
  lines.push(`Subtotal: ${formatPrice(order.subtotal)}`);
  if (order.discount > 0) {
    lines.push(`Desconto: -${formatPrice(order.discount)}`);
  }
  lines.push(`TOTAL: ${formatPrice(order.total)}`);

  if (order.address) {
    lines.push('');
    lines.push('*ENDERECO*');
    lines.push(order.address.cep || '-');
    lines.push([order.address.rua, order.address.numero].filter(Boolean).join(', '));
    lines.push(order.address.bairro || '-');
    lines.push([order.address.cidade, order.address.estado].filter(Boolean).join(' - '));
    if (order.address.complemento) {
      lines.push(order.address.complemento);
    }
  }

  lines.push('');
  lines.push('Aguardando confirmacao ✅');

  return lines.join('\n');
}
