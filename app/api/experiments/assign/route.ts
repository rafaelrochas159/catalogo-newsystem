import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/server';
import { assignExperiments } from '@/lib/experiments';

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUserFromRequest(request);
    const body = await request.json();
    const path = String(body.path || '/');
    const anonymousId = body.anonymousId ? String(body.anonymousId) : null;

    const assignments = await assignExperiments({
      path,
      userId: user?.id || null,
      email: user?.email || null,
      anonymousId,
    });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atribuir experimento.' },
      { status: 500 },
    );
  }
}
