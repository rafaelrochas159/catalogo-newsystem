import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/auth/server';
import {
  getAdminCustomerDetail,
  removeAdminCustomer,
  updateAdminCustomerStatus,
} from '@/lib/admin-customers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '').trim();

    if (action !== 'deactivate' && action !== 'reactivate') {
      return NextResponse.json({ error: 'Acao administrativa invalida.' }, { status: 400 });
    }

    const detail = await getAdminCustomerDetail(params.id);
    if (!detail.customer) {
      return NextResponse.json({ error: detail.error || 'Cliente nao encontrado.' }, { status: 404 });
    }

    const nextStatus = action === 'deactivate' ? 'inativo' : 'ativo';
    const data = await updateAdminCustomerStatus(detail.customer.userId, nextStatus);

    return NextResponse.json({
      data,
      message: nextStatus === 'inativo'
        ? 'Cliente inativado com seguranca.'
        : 'Cliente reativado com sucesso.',
    });
  } catch (error: any) {
    console.error('admin customer status failed', error);
    return NextResponse.json(
      { error: error?.message || 'Nao foi possivel atualizar o status do cliente.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  }

  try {
    const detail = await getAdminCustomerDetail(params.id);
    if (!detail.customer) {
      return NextResponse.json({ error: detail.error || 'Cliente nao encontrado.' }, { status: 404 });
    }

    if (!detail.customer.deletionPolicy.canDeletePermanently) {
      return NextResponse.json(
        { error: detail.customer.deletionPolicy.reason },
        { status: 409 },
      );
    }

    await removeAdminCustomer(detail.customer.userId);
    return NextResponse.json({
      success: true,
      message: 'Cadastro removido permanentemente com seguranca.',
    });
  } catch (error: any) {
    console.error('admin customer delete failed', error);
    return NextResponse.json(
      { error: error?.message || 'Nao foi possivel remover o cadastro do cliente.' },
      { status: 500 },
    );
  }
}
