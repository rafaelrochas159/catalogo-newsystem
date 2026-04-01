import { COMPANY_INFO } from '@/lib/constants';
import { formatPrice, getWhatsAppLink } from '@/lib/utils';

const ICON_CART = '\u{1F6D2}';
const ICON_CLIPBOARD = '\u{1F4CB}';
const ICON_BOX = '\u{1F4E6}';
const ICON_PIN = '\u{1F4CC}';

type OrderMessageItem = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type OrderMessageAddress = {
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string | null;
};

type OrderMessageCustomer = {
  nome?: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string | null;
};

export type OrderWhatsAppPayload = {
  orderNumber: string;
  catalogType?: string | null;
  items: OrderMessageItem[];
  subtotal: number;
  discount?: number;
  total: number;
  address?: OrderMessageAddress | null;
  customer?: OrderMessageCustomer | null;
  paymentMethod?: string | null;
  status_pagamento?: string | null;
  status_pedido?: string | null;
  paid_at?: string | null;
};

function toCleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOrderItems(items: any[]): OrderMessageItem[] {
  return Array.isArray(items)
    ? items.map((item) => ({
        name: toCleanString(item?.name || item?.product_name || item?.nome || 'Produto'),
        sku: toCleanString(item?.sku || '-'),
        quantity: Number(item?.quantity ?? item?.quantidade ?? 0),
        unitPrice: Number(item?.unitPrice ?? item?.unit_price ?? item?.preco_unitario ?? 0),
        totalPrice: Number(item?.totalPrice ?? item?.total_price ?? item?.preco_total ?? 0),
      }))
    : [];
}

function normalizeOrderAddress(address?: Record<string, unknown> | null) {
  if (!address || typeof address !== 'object') {
    return undefined;
  }

  return {
    cep: toCleanString(address.cep),
    rua: toCleanString(address.rua || address.street),
    numero: toCleanString(address.numero || address.number),
    bairro: toCleanString(address.bairro || address.neighborhood),
    cidade: toCleanString(address.cidade || address.city),
    estado: toCleanString(address.estado || address.state).toUpperCase(),
    complemento: toCleanString(address.complemento || address.complement) || null,
  };
}

function normalizeOrderCustomer(customer?: Record<string, unknown> | null) {
  if (!customer || typeof customer !== 'object') {
    return undefined;
  }

  return {
    nome: toCleanString(customer.nome || customer.name),
    telefone: toCleanString(customer.telefone || customer.phone),
    email: toCleanString(customer.email).toLowerCase(),
    cpf_cnpj: toCleanString(customer.cpf_cnpj) || null,
  };
}

export function isOrderPaymentConfirmed(order: Partial<OrderWhatsAppPayload>) {
  const paymentStatus = toCleanString(order.status_pagamento).toLowerCase();
  const orderStatus = toCleanString(order.status_pedido).toLowerCase();

  return (
    paymentStatus === 'approved' ||
    paymentStatus === 'pago' ||
    orderStatus === 'pago' ||
    orderStatus === 'confirmado' ||
    Boolean(order.paid_at)
  );
}

export function getOrderWhatsAppStatusText(order: Partial<OrderWhatsAppPayload>) {
  return isOrderPaymentConfirmed(order)
    ? 'Pagamento confirmado, pode separar o pedido'
    : 'Aguardando confirmacao';
}

export function getOrderWhatsAppActionLabel(order: Partial<OrderWhatsAppPayload>) {
  return isOrderPaymentConfirmed(order)
    ? 'Enviar pedido confirmado no WhatsApp'
    : 'Enviar resumo do pedido no WhatsApp';
}

function getCatalogTypeLabel(catalogType?: string | null) {
  return catalogType === 'CAIXA_FECHADA' ? 'Caixa fechada' : 'Unitario';
}

function getPaymentMethodLabel(order: Partial<OrderWhatsAppPayload>) {
  const paymentMethod = toCleanString(order.paymentMethod).toLowerCase();

  if (paymentMethod === 'whatsapp') {
    return 'WhatsApp';
  }

  return isOrderPaymentConfirmed(order) ? 'Pix aprovado' : 'Pix aguardando confirmacao';
}

export function canBuildOrderWhatsAppMessage(order: Partial<OrderWhatsAppPayload>) {
  return Boolean(toCleanString(order.orderNumber) && Array.isArray(order.items) && order.items.length > 0);
}

export function buildOrderWhatsAppPayloadFromOrder(order: any): OrderWhatsAppPayload {
  return {
    orderNumber: toCleanString(order?.orderNumber || order?.numero_pedido),
    catalogType: toCleanString(order?.catalogType || order?.tipo_catalogo),
    items: normalizeOrderItems(order?.items || order?.itens || []),
    subtotal: Number(order?.subtotal ?? order?.total ?? 0),
    discount: Number(order?.discount ?? order?.desconto_valor ?? order?.coupon_discount_value ?? 0),
    total: Number(order?.total ?? 0),
    address: normalizeOrderAddress(order?.address || order?.endereco),
    customer: normalizeOrderCustomer(order?.customer || {
      nome: order?.cliente_nome,
      telefone: order?.cliente_telefone,
      email: order?.cliente_email,
      cpf_cnpj: order?.cliente_cpf_cnpj,
    }),
    paymentMethod: toCleanString(order?.paymentMethod || order?.forma_pagamento),
    status_pagamento: toCleanString(order?.status_pagamento),
    status_pedido: toCleanString(order?.status_pedido),
    paid_at: toCleanString(order?.paid_at) || null,
  };
}

export function buildOrderWhatsAppMessage(input: OrderWhatsAppPayload) {
  const lines: string[] = [
    `${ICON_CART} NOVO PEDIDO - NEW SYSTEM`,
    `${ICON_CLIPBOARD} Pedido: ${input.orderNumber}`,
    `${ICON_BOX} Tipo: ${getCatalogTypeLabel(input.catalogType)}`,
    `Pagamento: ${getPaymentMethodLabel(input)}`,
    '',
    'CLIENTE',
    `${input.customer?.nome || 'Nao informado'}`,
    `${input.customer?.telefone || 'Nao informado'}`,
    `${input.customer?.email || 'Nao informado'}`,
    '',
    'ITENS:',
  ];

  input.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   SKU: ${item.sku || '-'}`);
    lines.push(`   Qtd: ${item.quantity}x`);
    lines.push(`   Unit: ${formatPrice(item.unitPrice)}`);
    lines.push(`   Total: ${formatPrice(item.totalPrice)}`);
    lines.push('');
  });

  lines.push('RESUMO:');
  lines.push(`Subtotal: ${formatPrice(Number(input.subtotal || 0))}`);
  if (Number(input.discount || 0) > 0) {
    lines.push(`Desconto: -${formatPrice(Number(input.discount || 0))}`);
  }
  lines.push(`TOTAL: ${formatPrice(Number(input.total || 0))}`);

  if (input.address) {
    lines.push('');
    lines.push('ENDERECO DE ENTREGA:');
    lines.push(`${ICON_PIN} CEP: ${input.address.cep || '-'}`);
    lines.push(`${ICON_PIN} ${[input.address.rua, input.address.numero].filter(Boolean).join(', ') || '-'}`);
    lines.push(`${ICON_PIN} ${input.address.bairro || '-'}`);
    lines.push(`${ICON_PIN} ${[input.address.cidade, input.address.estado].filter(Boolean).join(' - ') || '-'}`);
    if (input.address.complemento) {
      lines.push(`${ICON_PIN} ${input.address.complemento}`);
    }
  }

  lines.push('');
  lines.push('STATUS:');
  lines.push(getOrderWhatsAppStatusText(input));

  return lines.join('\n');
}

export function getOrderWhatsAppLink(input: OrderWhatsAppPayload, phone = COMPANY_INFO.whatsapp) {
  if (!canBuildOrderWhatsAppMessage(input)) {
    return null;
  }

  return getWhatsAppLink(phone, buildOrderWhatsAppMessage(input));
}

export function getOrderWhatsAppLinkFromOrder(order: any, phone = COMPANY_INFO.whatsapp) {
  const payload = buildOrderWhatsAppPayloadFromOrder(order);
  return getOrderWhatsAppLink(payload, phone);
}
