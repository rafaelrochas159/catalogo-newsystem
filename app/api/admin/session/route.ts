import { NextResponse } from 'next/server';
import {
  buildAdminSessionPayload,
  ensureAdminAccess,
  getAdminSessionFromRequest,
  getUserFromAccessToken,
} from '@/lib/auth/server';
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
} from '@/lib/auth/admin-session';

export async function GET(request: Request) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  return NextResponse.json({
    data: {
      email: session.email,
      role: session.role,
    },
  });
}

export async function POST(request: Request) {
  try {
    const { accessToken } = (await request.json()) as { accessToken?: string };
    if (!accessToken) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 400 });
    }

    const user = await getUserFromAccessToken(accessToken);
    if (!user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const adminAccess = await ensureAdminAccess(user);
    if (!adminAccess.allowed) {
      return NextResponse.json({ error: 'Acesso administrativo negado.' }, { status: 403 });
    }

    const payload = buildAdminSessionPayload(user, adminAccess.role, accessToken);
    const cookieValue = await createAdminSessionToken(payload);
    const cookie = getAdminSessionCookieOptions(payload.exp);

    const response = NextResponse.json({
      data: {
        email: payload.email,
        role: payload.role,
        promoted: adminAccess.promoted,
      },
    });

    response.cookies.set({
      name: getAdminSessionCookieName(),
      value: cookieValue,
      ...cookie.options,
    });

    return response;
  } catch (error: any) {
    console.error('Erro ao criar sessão admin:', error);
    return NextResponse.json({ error: 'Erro ao criar sessão administrativa.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: '',
    ...getAdminSessionCookieOptions(0).options,
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
