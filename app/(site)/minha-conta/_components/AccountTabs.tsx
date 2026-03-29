'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from './ProfileTab';
import { AddressTab } from './AddressTab';
import { OrdersTab } from './OrdersTab';

export function AccountTabs({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);

  return (
    <Tabs defaultValue="pedidos" className="space-y-6">
      <TabsList className="grid grid-cols-3 w-full max-w-xl">
        <TabsTrigger value="pedidos">Meus pedidos</TabsTrigger>
        <TabsTrigger value="dados">Meus dados</TabsTrigger>
        <TabsTrigger value="enderecos">Meus endereços</TabsTrigger>
      </TabsList>
      <TabsContent value="pedidos"><OrdersTab orders={data.orders || []} profile={data.profile} addresses={data.addresses || []} /></TabsContent>
      <TabsContent value="dados"><ProfileTab profile={data.profile} onSaved={(profile) => setData((p: any) => ({ ...p, profile }))} /></TabsContent>
      <TabsContent value="enderecos"><AddressTab addresses={data.addresses || []} onSaved={(address) => setData((p: any) => ({ ...p, addresses: [address] }))} /></TabsContent>
    </Tabs>
  );
}
