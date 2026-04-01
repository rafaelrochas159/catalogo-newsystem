'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Trash2, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  userId: string;
  status: string;
  canDeletePermanently: boolean;
  canDeactivate: boolean;
  deleteReason: string;
};

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function AdminCustomerActions({
  userId,
  status,
  canDeletePermanently,
  canDeactivate,
  deleteReason,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const isInactive = status === 'inativo';

  const handleStatusChange = () => {
    if (!canDeactivate || isPending) return;
    const action = isInactive ? 'reactivate' : 'deactivate';
    const confirmLabel = isInactive
      ? 'Reativar este cliente no painel?'
      : 'Inativar este cliente no painel?';

    if (!window.confirm(confirmLabel)) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/clientes/${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        });
        const json = await readJsonSafely(response);
        if (!response.ok) {
          throw new Error(json?.error || 'Nao foi possivel atualizar o status do cliente.');
        }

        toast.success(json?.message || 'Status atualizado.');
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || 'Falha ao atualizar cliente.');
      }
    });
  };

  const handleDelete = async () => {
    if (!canDeletePermanently || isDeleting) return;
    if (!window.confirm('Excluir permanentemente este cadastro sem historico? Esta acao nao pode ser desfeita.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/clientes/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const json = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(json?.error || 'Nao foi possivel excluir o cadastro.');
      }

      toast.success(json?.message || 'Cadastro removido com sucesso.');
      router.push('/admin/clientes');
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao excluir cliente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={isInactive ? 'outline' : 'secondary'}
          onClick={handleStatusChange}
          disabled={!canDeactivate || isPending || isDeleting}
        >
          {isInactive ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
          {isInactive ? 'Reativar' : 'Inativar'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={!canDeletePermanently || isDeleting || isPending}
          title={!canDeletePermanently ? deleteReason : 'Excluir permanentemente este cadastro'}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? 'Excluindo...' : 'Excluir permanente'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {canDeletePermanently
          ? 'Exclusao permanente disponivel porque este cliente nao possui historico comercial bloqueante.'
          : deleteReason}
      </p>
    </div>
  );
}
