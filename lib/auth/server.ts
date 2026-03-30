import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient, type User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { Database } from '@/lib/supabase/database.types';
import { createRequiredServerClient } from '@/lib/supabase/client';
import {
  getAdminSessionCookieName,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from './admin-session';

type AdminRole = 'admin' | 'manager';

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurado.');
  return url;
}

function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não configurado.');
  return anonKey;
}

function createAuthValidationClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getConfiguredAdminEmails() {
  const values = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(values);
}

function normalizeRole(role: unknown): AdminRole | null {
  if (role === 'admin' || role === 'manager') return role;
  return null;
}

function getRoleFromUser(user: User): AdminRole | null {
  return (
    normalizeRole((user.app_metadata as Record<string, unknown> | undefined)?.role) ||
    normalizeRole((user.app_metadata as Record<string, unknown> | undefined)?.user_role)
  );
}

function isConfiguredAdminEmail(user: User) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;
  return getConfiguredAdminEmails().has(email);
}

function decodeJwtExpiry(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')) as {
      exp?: number;
    };
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

export async function getUserFromAccessToken(accessToken: string) {
  const authClient = createAuthValidationClient();
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export function extractBearerToken(request: Request | NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export async function getAuthenticatedUserFromRequest(request: Request | NextRequest) {
  const accessToken = extractBearerToken(request);
  if (!accessToken) return { user: null, accessToken: null };

  const user = await getUserFromAccessToken(accessToken);
  return { user, accessToken };
}

export async function ensureAdminAccess(user: User) {
  const existingRole = getRoleFromUser(user);
  if (existingRole) {
    return { allowed: true as const, role: existingRole, promoted: false };
  }

  if (!isConfiguredAdminEmail(user)) {
    return { allowed: false as const, role: null, promoted: false };
  }

  const serviceClient = createRequiredServerClient();
  const nextAppMetadata = {
    ...(user.app_metadata || {}),
    role: 'admin',
  };

  const { error } = await serviceClient.auth.admin.updateUserById(user.id, {
    app_metadata: nextAppMetadata,
  });

  if (error) {
    throw error;
  }

  return { allowed: true as const, role: 'admin' as const, promoted: true };
}

export async function getAdminSessionFromRequest(request: Request | NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${getAdminSessionCookieName()}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  return verifyAdminSessionToken(token || null);
}

export async function getAdminSessionFromCookies() {
  const token = cookies().get(getAdminSessionCookieName())?.value;
  return verifyAdminSessionToken(token);
}

export async function requireAdminPage() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}

export async function requireAdminRequest(request: Request | NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  return session;
}

export function buildAdminSessionPayload(user: User, role: AdminRole, accessToken?: string | null): AdminSessionPayload {
  const now = Math.floor(Date.now() / 1000);
  const accessTokenExp = accessToken ? decodeJwtExpiry(accessToken) : null;
  const cappedExp = now + 60 * 60 * 8;

  return {
    sub: user.id,
    email: user.email?.trim().toLowerCase() || '',
    role,
    exp: accessTokenExp ? Math.min(accessTokenExp, cappedExp) : cappedExp,
  };
}
