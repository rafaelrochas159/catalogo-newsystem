'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from './ProfileTab';
import { AddressTab } from './AddressTab';
import { OrdersTab } from './OrdersTab';
import { FavoritesTab } from './FavoritesTab';

export function AccountTabsEnhanced({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);

  return (
    <Tabs defaultValue="pedidos" className="space-y-6">
      <TabsList className="grid w-full max-w-3xl grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="pedidos">Meus pedidos</TabsTrigger>
        <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
        <TabsTrigger value="dados">Meus dados</TabsTrigger>
        <TabsTrigger value="enderecos">Meus enderecos</TabsTrigger>
      </TabsList>
      <TabsContent value="pedidos"><OrdersTab orders={data.orders || []} profile={data.profile} addresses={data.addresses || []} /></TabsContent>
      <TabsContent value="favoritos"><FavoritesTab favorites={data.favorites || []} /></TabsContent>
      <TabsContent value="dados"><ProfileTab profile={data.profile} onSaved={(profile) => setData((current: any) => ({ ...current, profile }))} /></TabsContent>
      <TabsContent value="enderecos"><AddressTab addresses={data.addresses || []} onSaved={(address) => setData((current: any) => ({ ...current, addresses: [address] }))} /></TabsContent>
    </Tabs>
  );
}
