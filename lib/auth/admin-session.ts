const ADMIN_SESSION_COOKIE = 'ns_admin_session';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type AdminSessionPayload = {
  sub: string;
  email: string;
  role: 'admin' | 'manager';
  exp: number;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toBase64Url(value: string) {
  return bytesToBase64(new TextEncoder().encode(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return new TextDecoder().decode(base64ToBytes(`${normalized}${padding}`));
}

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Defina ADMIN_SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY para assinar a sessão admin.');
  }
  return secret;
}

async function signValue(value: string) {
  const secret = getAdminSessionSecret();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminSessionMaxAgeSeconds() {
  return ADMIN_SESSION_MAX_AGE_SECONDS;
}

export async function createAdminSessionToken(
  input: Omit<AdminSessionPayload, 'exp'> & { exp?: number }
) {
  const exp = input.exp ?? Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const payload: AdminSessionPayload = {
    sub: input.sub,
    email: input.email,
    role: input.role,
    exp,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string | null): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signValue(encodedPayload);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AdminSessionPayload;
    if (!payload?.sub || !payload?.email || !payload?.role || !payload?.exp) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions(expiresAtSeconds?: number) {
  const expires = new Date((expiresAtSeconds ?? Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS) * 1000);

  return {
    name: ADMIN_SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires,
      maxAge: Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000)),
    },
  };
}
