export function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeName(value?: string | null) {
  return String(value || '').trim();
}

export function normalizePhone(value?: string | null) {
  return onlyDigits(value);
}

export function normalizeCpfCnpj(value?: string | null) {
  return onlyDigits(value);
}

export function validateRegistrationPayload(input: {
  nome?: string | null;
  email?: string | null;
  password?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
}) {
  if (!normalizeName(input.nome)) {
    return 'Nome e obrigatorio.';
  }

  if (!normalizeEmail(input.email) || !/.+@.+\..+/.test(normalizeEmail(input.email))) {
    return 'E-mail invalido.';
  }

  if (!String(input.password || '').trim()) {
    return 'Senha e obrigatoria.';
  }

  if (String(input.password || '').length < 6) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  if (normalizePhone(input.telefone).length < 10) {
    return 'Telefone obrigatorio e invalido.';
  }

  const cpfCnpj = normalizeCpfCnpj(input.cpf_cnpj);
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return 'CPF/CNPJ obrigatorio e invalido.';
  }

  return null;
}

export function validateProfilePayload(input: {
  nome?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
}) {
  if (!normalizeName(input.nome)) {
    return 'Nome e obrigatorio.';
  }

  if (normalizePhone(input.telefone).length < 10) {
    return 'Telefone obrigatorio e invalido.';
  }

  const cpfCnpj = normalizeCpfCnpj(input.cpf_cnpj);
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return 'CPF/CNPJ obrigatorio e invalido.';
  }

  return null;
}

export function validateAddressPayload(input: {
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
  if (onlyDigits(input.cep).length !== 8) {
    return 'CEP obrigatorio e invalido.';
  }

  if (!String(input.rua || '').trim()) {
    return 'Rua obrigatoria.';
  }

  if (!String(input.numero || '').trim()) {
    return 'Numero obrigatorio.';
  }

  if (!String(input.bairro || '').trim()) {
    return 'Bairro obrigatorio.';
  }

  if (!String(input.cidade || '').trim()) {
    return 'Cidade obrigatoria.';
  }

  if (String(input.estado || '').trim().length !== 2) {
    return 'Estado obrigatorio.';
  }

  return null;
}
