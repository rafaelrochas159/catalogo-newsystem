export type CheckoutCustomerForm = {
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj?: string;
};

export type CheckoutAddressForm = {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
};

type CheckoutAccountLike = {
  profile?: Record<string, unknown> | null;
  addresses?: Array<Record<string, unknown>> | null;
};

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function normalizeAddressRecord(address?: Record<string, unknown> | null): CheckoutAddressForm {
  return {
    cep: pickFirstString(address?.cep),
    rua: pickFirstString(address?.rua, address?.street),
    numero: pickFirstString(address?.numero, address?.number),
    bairro: pickFirstString(address?.bairro, address?.neighborhood),
    cidade: pickFirstString(address?.cidade, address?.city),
    estado: pickFirstString(address?.estado, address?.state).toUpperCase().slice(0, 2),
    complemento: pickFirstString(address?.complemento, address?.complement),
  };
}

function mergeString(currentValue: string | undefined, nextValue: string | undefined, force?: boolean) {
  if (force) {
    return nextValue || '';
  }

  return currentValue && currentValue.trim() ? currentValue : (nextValue || '');
}

export function buildCheckoutPrefill(args: {
  account?: CheckoutAccountLike | null;
  sessionUser?: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
}) {
  const profile = args.account?.profile || null;
  const primaryAddress = args.account?.addresses?.[0] || null;
  const sessionMetadata = args.sessionUser?.user_metadata || {};

  const customer: CheckoutCustomerForm = {
    nome: pickFirstString(
      profile?.nome,
      profile?.name,
      sessionMetadata.name,
      sessionMetadata.full_name,
    ),
    telefone: pickFirstString(
      profile?.telefone,
      profile?.phone,
      sessionMetadata.phone,
    ),
    email: pickFirstString(
      profile?.email,
      args.sessionUser?.email,
    ).toLowerCase(),
    cpf_cnpj: pickFirstString(
      profile?.cpf_cnpj,
      sessionMetadata.cpf_cnpj,
    ),
  };

  return {
    customer,
    address: normalizeAddressRecord(primaryAddress),
  };
}

export function mergeCheckoutPrefill(args: {
  currentCustomer: CheckoutCustomerForm;
  currentAddress: CheckoutAddressForm;
  prefill: {
    customer: CheckoutCustomerForm;
    address: CheckoutAddressForm;
  };
  force?: boolean;
}) {
  const { currentCustomer, currentAddress, prefill, force = false } = args;

  return {
    customer: {
      nome: mergeString(currentCustomer.nome, prefill.customer.nome, force),
      telefone: mergeString(currentCustomer.telefone, prefill.customer.telefone, force),
      email: mergeString(currentCustomer.email, prefill.customer.email, force),
      cpf_cnpj: mergeString(currentCustomer.cpf_cnpj, prefill.customer.cpf_cnpj, force),
    },
    address: {
      cep: mergeString(currentAddress.cep, prefill.address.cep, force),
      rua: mergeString(currentAddress.rua, prefill.address.rua, force),
      numero: mergeString(currentAddress.numero, prefill.address.numero, force),
      bairro: mergeString(currentAddress.bairro, prefill.address.bairro, force),
      cidade: mergeString(currentAddress.cidade, prefill.address.cidade, force),
      estado: mergeString(currentAddress.estado, prefill.address.estado, force),
      complemento: mergeString(currentAddress.complemento, prefill.address.complemento, force),
    },
  };
}

export function mergeCheckoutCustomerForm(
  currentCustomer: CheckoutCustomerForm,
  nextCustomer: CheckoutCustomerForm,
  force = false,
) {
  return {
    nome: mergeString(currentCustomer.nome, nextCustomer.nome, force),
    telefone: mergeString(currentCustomer.telefone, nextCustomer.telefone, force),
    email: mergeString(currentCustomer.email, nextCustomer.email, force),
    cpf_cnpj: mergeString(currentCustomer.cpf_cnpj, nextCustomer.cpf_cnpj, force),
  };
}

export function mergeCheckoutAddressForm(
  currentAddress: CheckoutAddressForm,
  nextAddress: CheckoutAddressForm,
  force = false,
) {
  return {
    cep: mergeString(currentAddress.cep, nextAddress.cep, force),
    rua: mergeString(currentAddress.rua, nextAddress.rua, force),
    numero: mergeString(currentAddress.numero, nextAddress.numero, force),
    bairro: mergeString(currentAddress.bairro, nextAddress.bairro, force),
    cidade: mergeString(currentAddress.cidade, nextAddress.cidade, force),
    estado: mergeString(currentAddress.estado, nextAddress.estado, force),
    complemento: mergeString(currentAddress.complemento, nextAddress.complemento, force),
  };
}

export function applyCheckoutPrefillToPayload<T extends {
  cliente?: Record<string, unknown>;
  endereco?: Record<string, unknown>;
}>(payload: T, prefill: { customer: CheckoutCustomerForm; address: CheckoutAddressForm }) {
  return {
    ...payload,
    cliente: {
      ...(payload.cliente || {}),
      nome: pickFirstString(payload.cliente?.nome, prefill.customer.nome),
      telefone: pickFirstString(payload.cliente?.telefone, prefill.customer.telefone),
      email: pickFirstString(payload.cliente?.email, prefill.customer.email).toLowerCase(),
      cpf_cnpj: pickFirstString(payload.cliente?.cpf_cnpj, prefill.customer.cpf_cnpj) || null,
    },
    endereco: {
      ...(payload.endereco || {}),
      cep: pickFirstString(payload.endereco?.cep, prefill.address.cep),
      rua: pickFirstString(payload.endereco?.rua, prefill.address.rua),
      numero: pickFirstString(payload.endereco?.numero, prefill.address.numero),
      complemento: pickFirstString(payload.endereco?.complemento, prefill.address.complemento) || '',
      bairro: pickFirstString(payload.endereco?.bairro, prefill.address.bairro),
      cidade: pickFirstString(payload.endereco?.cidade, prefill.address.cidade),
      estado: pickFirstString(payload.endereco?.estado, prefill.address.estado).toUpperCase().slice(0, 2),
    },
  };
}
