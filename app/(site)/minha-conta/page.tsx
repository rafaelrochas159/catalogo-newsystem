import { redirect } from 'next/navigation';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { getCustomerAccount, ensureCustomerProfile } from '@/lib/customer-account';
import { AccountTabs } from './_components/AccountTabs';

export default async function MinhaContaPage() {
  const db = createRequiredServerClient() as any;
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) redirect('/login');

  await ensureCustomerProfile(user as any);
  const account = await getCustomerAccount(user.id);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Minha conta</h1>
      <AccountTabs initialData={account} />
    </div>
  );
}
