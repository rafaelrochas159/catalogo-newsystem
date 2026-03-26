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
  const cleanedPhone = phone.replace(/\D/g, '');
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

export function generateOrderMessage(order: {
  orderNumber: string;
  catalogType: string;
  items: OrderMessageItem[];
  subtotal: number;
  discount: number;
  total: number;
  address?: AddressData;
}): string {
  const typeLabel = order.catalogType === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada';
  
  let message = `🛒 *NOVO PEDIDO - NEW SYSTEM*\n`;
  message += `📋 Pedido: ${order.orderNumber}\n`;
  message += `📦 Tipo: ${typeLabel}\n\n`;
  
  message += `*ITENS:*\n`;
  order.items.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`;
    message += `   SKU: ${item.sku}\n`;
    message += `   Qtd: ${item.quantity}x\n`;
    message += `   Unit: ${formatPrice(item.unitPrice)}\n`;
    message += `   Total: ${formatPrice(item.totalPrice)}\n\n`;
  });
  
  message += `*RESUMO:*\n`;
  message += `Subtotal: ${formatPrice(order.subtotal)}\n`;
  if (order.discount > 0) {
    message += `Desconto: -${formatPrice(order.discount)}\n`;
  }
  message += `*TOTAL: ${formatPrice(order.total)}*\n\n`;
  
  // Adicionar endereço se fornecido
  if (order.address) {
    message += `*ENDEREÇO DE ENTREGA:*\n`;
    message += `📮 CEP: ${order.address.cep}\n`;
    message += `📍 ${order.address.rua}, ${order.address.numero}\n`;
    message += `🏘️ ${order.address.bairro}\n`;
    message += `🌆 ${order.address.cidade} - ${order.address.estado}\n`;
    if (order.address.complemento) {
      message += `📝 ${order.address.complemento}\n`;
    }
    message += `\n`;
  }
  
  message += `Aguardo confirmação! ✅`;
  
  return message;
}