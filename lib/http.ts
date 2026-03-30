export async function readJsonSafely<T = any>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function getResponseErrorMessage(
  response: Response,
  payload: any,
  fallback: string
) {
  if (payload && typeof payload === 'object' && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (response.status === 401) {
    return 'Sua sessao expirou. Entre novamente para continuar.';
  }

  if (response.status === 403) {
    return 'Voce nao tem permissao para acessar esta informacao.';
  }

  if (response.status >= 500) {
    return 'Estamos com instabilidade ao carregar seus dados. Tente novamente em instantes.';
  }

  return fallback;
}
