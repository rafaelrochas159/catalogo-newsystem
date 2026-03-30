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
      <TabsList className="grid w-full rounded-2xl border bg-card p-1 grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="pedidos" className="rounded-xl">Meus pedidos</TabsTrigger>
        <TabsTrigger value="favoritos" className="rounded-xl">Favoritos</TabsTrigger>
        <TabsTrigger value="dados" className="rounded-xl">Meus dados</TabsTrigger>
        <TabsTrigger value="enderecos" className="rounded-xl">Enderecos</TabsTrigger>
      </TabsList>
      <TabsContent value="pedidos"><OrdersTab orders={data.orders || []} profile={data.profile} addresses={data.addresses || []} /></TabsContent>
      <TabsContent value="favoritos"><FavoritesTab favorites={data.favorites || []} /></TabsContent>
      <TabsContent value="dados"><ProfileTab profile={data.profile} onSaved={(profile) => setData((current: any) => ({ ...current, profile }))} /></TabsContent>
      <TabsContent value="enderecos"><AddressTab addresses={data.addresses || []} onSaved={(address) => setData((current: any) => ({ ...current, addresses: [address] }))} /></TabsContent>
    </Tabs>
  );
}

