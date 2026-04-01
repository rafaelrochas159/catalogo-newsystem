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

export function normalizeCepForCheckout(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (!digits) {
    return '';
  }

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

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
    cep: normalizeCepForCheckout(address?.cep),
    rua: pickFirstString(address?.rua, address?.street),
    numero: pickFirstString(address?.numero, address?.number),
    bairro: pickFirstString(address?.bairro, address?.neighborhood),
    cidade: pickFirstString(address?.cidade, address?.city),
    estado: pickFirstString(address?.estado, address?.state).toUpperCase().slice(0, 2),
    complemento: pickFirstString(address?.complemento, address?.complement),
  };
}

function getAddressCompleteness(address?: Record<string, unknown> | null) {
  if (!address) {
    return 0;
  }

  return [
    address.cep,
    address.rua || address.street,
    address.numero || address.number,
    address.bairro || address.neighborhood,
    address.cidade || address.city,
    address.estado || address.state,
    address.complemento || address.complement,
  ].filter((value) => typeof value === 'string' && value.trim()).length;
}

function getAddressUpdatedAt(address?: Record<string, unknown> | null) {
  if (!address) {
    return 0;
  }

  const value = address.updated_at || address.created_at;
  return typeof value === 'string' ? new Date(value).getTime() || 0 : 0;
}

function pickBestAddressRecord(addresses?: Array<Record<string, unknown>> | null) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null;
  }

  return [...addresses].sort((a, b) => {
    const principalDiff = Number(Boolean((b as any)?.principal)) - Number(Boolean((a as any)?.principal));
    if (principalDiff !== 0) {
      return principalDiff;
    }

    const completenessDiff = getAddressCompleteness(b) - getAddressCompleteness(a);
    if (completenessDiff !== 0) {
      return completenessDiff;
    }

    return getAddressUpdatedAt(b) - getAddressUpdatedAt(a);
  })[0];
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
  const primaryAddress = pickBestAddressRecord(args.account?.addresses) || null;
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
    cep: normalizeCepForCheckout(mergeString(currentAddress.cep, nextAddress.cep, force)),
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
      cep: normalizeCepForCheckout(pickFirstString(payload.endereco?.cep, prefill.address.cep)),
      rua: pickFirstString(payload.endereco?.rua, prefill.address.rua),
      numero: pickFirstString(payload.endereco?.numero, prefill.address.numero),
      complemento: pickFirstString(payload.endereco?.complemento, prefill.address.complemento) || '',
      bairro: pickFirstString(payload.endereco?.bairro, prefill.address.bairro),
      cidade: pickFirstString(payload.endereco?.cidade, prefill.address.cidade),
      estado: pickFirstString(payload.endereco?.estado, prefill.address.estado).toUpperCase().slice(0, 2),
    },
  };
}
